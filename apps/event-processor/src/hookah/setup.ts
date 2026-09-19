import { isHookahConfigured } from './client.js';
import { config } from '../config/index.js';
import { prisma } from '@radix-bet/database';
import { logger } from '../utils/logger.js';
import { ensureTrigger, syncTriggersFromHookah, removeTrigger } from './triggers.js';

export async function setupHookahWebhook(): Promise<void> {
  if (!isHookahConfigured()) {
    logger.info('Hookah SDK not configured, skipping webhook setup');
    return;
  }

  const { RADIX_PACKAGE_ADDRESS } = config;

  if (!RADIX_PACKAGE_ADDRESS) {
    logger.warn('RADIX_PACKAGE_ADDRESS not set, skipping Hookah setup');
    return;
  }

  await syncTriggersFromHookah();

  // 2. Reconcile package trigger — ensure exactly one for current RADIX_PACKAGE_ADDRESS
  const allTriggers = await prisma.hookahTrigger.findMany({
    where: { eventName: 'BetCreatedEvent' }
  });

  for (const trigger of allTriggers) {
    if (trigger.emitterAddress !== RADIX_PACKAGE_ADDRESS) {
      logger.info(`Removing stale package trigger for old address: ${trigger.emitterAddress.slice(0, 20)}...`);
      await removeTrigger(trigger.emitterAddress, 'BetCreatedEvent');
    }
  }

  // Ensure current package trigger exists
  await ensureTrigger(RADIX_PACKAGE_ADDRESS, 'BetCreatedEvent');

  // 3. Reconcile component triggers — verify each component's bet exists
  const componentTriggers = await prisma.hookahTrigger.findMany({
    where: {
      eventName: { not: 'BetCreatedEvent' }
    }
  });

  const componentAddresses = [...new Set(componentTriggers.map((t) => t.emitterAddress))];
  for (const addr of componentAddresses) {
    const bet = await prisma.bet.findUnique({ where: { componentAddress: addr } });
    if (!bet) {
      logger.info(`Removing orphaned triggers for non-existent bet: ${addr.slice(0, 20)}...`);
      const orphaned = componentTriggers.filter((t) => t.emitterAddress === addr);
      for (const trigger of orphaned) {
        await removeTrigger(trigger.emitterAddress, trigger.eventName);
      }
    }
  }

  logger.info('Hookah startup reconciliation complete');
}
