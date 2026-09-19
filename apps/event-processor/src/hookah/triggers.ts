import { getHookahSdk, isHookahConfigured } from './client.js';
import { config } from '../config/index.js';
import { prisma } from '@radix-bet/database';
import { logger } from '../utils/logger.js';

type HookahSdk = ReturnType<typeof getHookahSdk>;
type HookahClient = Awaited<ReturnType<HookahSdk['getTrpcClient']>>;

let cachedClient: HookahClient | null = null;
let cachedWebhookId: string | null = null;

/** Get authenticated Hookah tRPC client (cached for queries) */
export async function getHookahClient(): Promise<HookahClient> {
  if (cachedClient) return cachedClient;
  const sdk = getHookahSdk();
  await sdk.auth();
  cachedClient = await sdk.getTrpcClient();
  return cachedClient;
}

/**
 * Get a fresh authenticated client (re-authenticates). Required for mutations
 * because the Hookah server invalidates sessions after certain operations.
 **/
export async function getFreshHookahClient(): Promise<HookahClient> {
  const sdk = getHookahSdk();
  await sdk.auth();
  const client = await sdk.getTrpcClient();
  cachedClient = client;
  return client;
}

/** Get or create the webhook, return its ID (cached after first call) */
export async function ensureWebhookId(): Promise<string> {
  if (cachedWebhookId) return cachedWebhookId;

  const { HOOKAH_WEBHOOK_URL, HOOKAH_WEBHOOK_SECRET, RADIX_NETWORK } = config;
  if (!HOOKAH_WEBHOOK_URL) throw new Error('HOOKAH_WEBHOOK_URL not set');

  const client = await getHookahClient();
  const existing = await client.webhook.getByUserId.query();
  let webhook = existing.find(
    (w: (typeof existing)[number]) =>
      w.definition.type === 'webhook' && w.definition.url === HOOKAH_WEBHOOK_URL
  );

  if (!webhook) {
    webhook = await client.webhook.create.mutate({
      url: HOOKAH_WEBHOOK_URL,
      name: `${RADIX_NETWORK} RADIX.BET ${HOOKAH_WEBHOOK_URL.slice(6,40)}`,
      ...(HOOKAH_WEBHOOK_SECRET ? { headerKey: 'x-webhook-signature', headerValue: HOOKAH_WEBHOOK_SECRET } : {})
    });
    logger.info(`Webhook created: ${webhook.id}`);
  } else {
    logger.info(`Using existing webhook: ${webhook.id}`);
  }

  cachedWebhookId = webhook.id;
  return webhook.id;
}

/**
 * Ensure a Hookah trigger exists for the given emitter + event.
 * Checks our DB first to avoid redundant Hookah API calls.
 * Returns the trigger ID.
 */
export async function ensureTrigger(
  emitterAddress: string,
  eventName: string
): Promise<string> {
  // Check DB first
  const existing = await prisma.hookahTrigger.findUnique({
    where: { emitterAddress_eventName: { emitterAddress, eventName } }
  });
  if (existing) {
    logger.debug(`Trigger already tracked: ${eventName} @ ${emitterAddress.slice(0, 20)}...`);
    return existing.id;
  }

  // Create on Hookah
  const webhookId = await ensureWebhookId();
  const client = await getHookahClient();

  try {
    const trigger = await client.trigger.create.mutate({
      webhookId,
      emitterAddress,
      eventName
    });

    // Track in DB — catch unique constraint violation from concurrent workers
    try {
      await prisma.hookahTrigger.create({
        data: {
          id: trigger.id,
          webhookId,
          emitterAddress,
          eventName
        }
      });
    } catch (dbErr: unknown) {
      // P2002 = unique constraint violation — another worker already created it
      if (dbErr instanceof Error && 'code' in dbErr && (dbErr as { code: string }).code === 'P2002') {
        logger.info(`Trigger DB record already exists (race condition): ${eventName} @ ${emitterAddress.slice(0, 20)}...`);
        return trigger.id;
      }
      throw dbErr;
    }

    logger.info(`Trigger created for ${eventName} @ ${emitterAddress.slice(0, 20)}...`);
    return trigger.id;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('already exists') || message.includes('duplicate')) {
      logger.info(`Trigger for ${eventName} already exists on Hookah, skipping`);
      return 'unknown'; // Hookah has it but we don't track it — harmless
    }
    throw err;
  }
}

/**
 * Remove a Hookah trigger by emitter address + event name.
 * Deletes from Hookah API and local DB.
 */
export async function removeTrigger(
  emitterAddress: string,
  eventName: string
): Promise<void> {
  const existing = await prisma.hookahTrigger.findUnique({
    where: { emitterAddress_eventName: { emitterAddress, eventName } }
  });
  if (!existing) {
    logger.debug(`Trigger not tracked, skip removal: ${eventName} @ ${emitterAddress.slice(0, 20)}...`);
    return;
  }

  try {
    const client = await getFreshHookahClient();
    await client.trigger.remove.mutate({ id: existing.id });
    logger.info(`Trigger deleted from Hookah: ${eventName} @ ${emitterAddress.slice(0, 20)}...`);
  } catch (err) {
    logger.error(err instanceof Error ? err.message : String(err))
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('not found')) {
      logger.warn(`Failed to delete trigger from Hookah (continuing): ${message}`);
    }
  }

  await prisma.hookahTrigger.delete({
    where: { id: existing.id }
  }).catch(() => {
    // Already deleted or doesn't exist
  });
}

/**
 * Remove multiple triggers for a component in batch.
 */
export async function removeComponentTriggers(
  componentAddress: string,
  eventNames: string[]
): Promise<void> {
  if (!isHookahConfigured()) return;

  await Promise.allSettled(
    eventNames.map(async (eventName) => {
      try {
        await removeTrigger(componentAddress, eventName);
      } catch (err) {
        logger.error(`Failed to remove trigger for ${eventName} @ ${componentAddress}`, {
          error: err instanceof Error ? err.message : String(err)
        });
      }
    })
  );
}

/** Create component-level triggers for a newly created bet.
 *  Per the trigger state machine, only vote + winner triggers at creation time. */
export async function createComponentTriggers(componentAddress: string): Promise<void> {
  if (!isHookahConfigured()) return;

  const componentEvents = [
    'BetVoteEvent',
    'BetMarkWinnerEvent',
    'BetWinnerVoteEvent'
  ];

  await Promise.allSettled(
    componentEvents.map(async (eventName) => {
      try {
        await ensureTrigger(componentAddress, eventName);
      } catch (err) {
        logger.error(`Failed to create trigger for ${eventName} @ ${componentAddress}`, {
          error: err instanceof Error ? err.message : String(err)
        });
      }
    })
  );
}

/** Create claim-phase triggers after winner is marked */
export async function createClaimTriggers(componentAddress: string): Promise<void> {
  if (!isHookahConfigured()) return;

  const claimEvents = ['BetPrizeClaimedEvent', 'BetAllPrizesClaimedEvent'];
  await Promise.allSettled(
    claimEvents.map(async (eventName) => {
      try {
        await ensureTrigger(componentAddress, eventName);
      } catch (err) {
        logger.error(`Failed to create claim trigger for ${eventName} @ ${componentAddress}`, {
          error: err instanceof Error ? err.message : String(err)
        });
      }
    })
  );
}

/** Remove vote-phase triggers after winner is marked */
export async function removeVoteTriggers(componentAddress: string): Promise<void> {
  await removeComponentTriggers(componentAddress, ['BetVoteEvent', 'BetWinnerVoteEvent']);
}

/** Remove all claim triggers after all prizes claimed */
export async function removeClaimTriggers(componentAddress: string): Promise<void> {
  await removeComponentTriggers(componentAddress, ['BetPrizeClaimedEvent', 'BetAllPrizesClaimedEvent']);
}

/**
 * Sync triggers from Hookah API into local DB.
 * This ensures the DB stays in sync even after resets/migrations.
 */
export async function syncTriggersFromHookah(): Promise<void> {
  if (!isHookahConfigured()) return;

  try {
    const client = await getHookahClient();
    const remoteTriggers = await client.trigger.getByUserId.query();

    let synced = 0;
    for (const trigger of remoteTriggers) {
      // Extract emitterAddress and eventName from the trigger definition
      const definition = trigger.definition as { rules?: Array<{ emitterAddress?: string; eventName?: string }> } | undefined;
      const rule = definition?.rules?.[0];
      if (!rule?.emitterAddress || !rule?.eventName) continue;

      try {
        await prisma.hookahTrigger.upsert({
          where: { emitterAddress_eventName: { emitterAddress: rule.emitterAddress, eventName: rule.eventName } },
          update: { id: trigger.id, webhookId: trigger.webhookId },
          create: {
            id: trigger.id,
            webhookId: trigger.webhookId,
            emitterAddress: rule.emitterAddress,
            eventName: rule.eventName
          }
        });
        synced++;
      } catch (err) {
        logger.warn(`Failed to sync trigger ${trigger.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    logger.info(`Synced ${synced}/${remoteTriggers.length} triggers from Hookah to local DB`);
  } catch (err) {
    logger.error(`Failed to sync triggers from Hookah: ${err instanceof Error ? err.message : String(err)}`);
  }
}
