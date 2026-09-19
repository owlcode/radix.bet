import { prisma } from '@radix-bet/database';
import type { BetCreatedJobData } from '@radix-bet/types';
import { logger } from '../utils/logger.js';
import { updateEventStatus } from './utils.js';
import { createComponentTriggers } from '../hookah/triggers.js';
import { generateBetSlug } from '../utils/slug.js';

const SYSTEM_IDENTITY = 'identity_system_unlinked_bets';
let systemUserCreated = false;

/** Ensure the system placeholder user exists (cached after first creation) */
async function ensureSystemUser(): Promise<void> {
  if (systemUserCreated) return;
  await prisma.user.upsert({
    where: { identityAddress: SYSTEM_IDENTITY },
    update: {},
    create: { identityAddress: SYSTEM_IDENTITY }
  });
  systemUserCreated = true;
}

export async function processBetCreated(data: BetCreatedJobData): Promise<void> {
  const { eventId, event } = data;

  logger.info('Processing BetCreatedEvent', {
    eventId,
    componentAddress: event.componentAddress,
    name: event.name,
    optionCount: event.options?.length ?? 0,
    transactionId: event.transactionId
  });

  try {
    await ensureSystemUser();

    // Look up BetExtension for metadata not available on-chain
    const extension = await prisma.betExtension.findUnique({
      where: { transactionId: event.transactionId }
    });
    if (extension) {
      logger.info('Found BetExtension for transaction', {
        transactionId: event.transactionId,
        hasDescription: !!extension.description,
        hasCategoryId: !!extension.categoryId
      });
    } else {
      logger.debug('No BetExtension found for transaction', {
        transactionId: event.transactionId
      });
    }

    // Ensure the real user exists if identity came from BetExtension
    if (extension?.userIdentityAddress && extension.userIdentityAddress !== SYSTEM_IDENTITY) {
      await prisma.user.upsert({
        where: { identityAddress: extension.userIdentityAddress },
        update: {},
        create: { identityAddress: extension.userIdentityAddress }
      });
    }

    // Determine user identity: from BetExtension (UI-created) or system (oracle)
    const userIdentity = extension?.userIdentityAddress || SYSTEM_IDENTITY;

    const betName = event.name || 'Unknown Bet';
    const slug = extension?.slug || generateBetSlug(betName);

    // Use on-chain deadline if available, otherwise fallback to 30 days
    const deadline = event.deadline && event.deadline > 0
      ? new Date(event.deadline * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Upsert bet record — atomic and idempotent, handles concurrent workers
    // and webhook retries without race conditions
    const result = await prisma.bet.upsert({
      where: { componentAddress: event.componentAddress },
      update: {
        deadline,
        currency: event.currency || null,
        ...(extension?.description && { description: extension.description }),
        ...(extension?.categoryId && { categoryId: extension.categoryId }),
      },
      create: {
        componentAddress: event.componentAddress,
        name: betName,
        slug,
        deadline,
        currency: event.currency || null,
        description: extension?.description || null,
        categoryId: extension?.categoryId || null,
        userIdentityAddress: userIdentity,
        status: 'ACTIVE',
        options: {
          create: (event.options || []).map((option) => ({
            name: option.name,
            imageUrl: option.iconUrl || '',
            resourceAddress: option.resourceAddress,
            totalVotes: '0'
          }))
        }
      }
    });

    // Ensure slug is set (backfill for older bets without a slug)
    if (!result.slug) {
      try {
        await prisma.bet.update({
          where: { componentAddress: event.componentAddress },
          data: { slug }
        });
      } catch {
        // Unique constraint violation — another worker already set it
      }
    }

    // Clean up the BetExtension now that it's been consumed
    if (extension) {
      await prisma.betExtension.delete({
        where: { transactionId: event.transactionId }
      }).catch(() => {
        // Already deleted — race condition with concurrent workers
      });
      logger.debug('Deleted BetExtension', { transactionId: event.transactionId });
    }

    // Now that the Bet exists, link the EventLog record to it
    await prisma.eventLog.update({
      where: { id: eventId },
      data: { componentAddress: event.componentAddress }
    });

    await updateEventStatus(eventId, 'PROCESSED');

    // Register component-level Hookah triggers for this bet
    try {
      await createComponentTriggers(event.componentAddress);
    } catch (err) {
      logger.warn('Failed to create component triggers (non-fatal)', {
        componentAddress: event.componentAddress,
        error: err instanceof Error ? err.message : String(err)
      });
    }

    logger.info('BetCreatedEvent processed successfully', {
      eventId,
      componentAddress: event.componentAddress,
      optionsCreated: event.options?.length ?? 0,
      hadExtension: !!extension
    });
  } catch (error) {
    await updateEventStatus(
      eventId,
      'FAILED',
      error instanceof Error ? error.message : 'Unknown error'
    );
    throw error;
  }
}
