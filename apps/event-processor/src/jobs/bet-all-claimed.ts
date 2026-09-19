import { prisma } from '@radix-bet/database';
import type { BetAllClaimedJobData } from '@radix-bet/types';
import { logger } from '../utils/logger.js';
import { updateEventStatus } from './utils.js';
import { removeClaimTriggers } from '../hookah/triggers.js';

export async function processBetAllClaimed(data: BetAllClaimedJobData): Promise<void> {
  const { eventId, event } = data;

  logger.info('Processing BetAllPrizesClaimedEvent', {
    eventId,
    componentAddress: event.componentAddress
  });

  try {
    const bet = await prisma.bet.findUnique({
      where: { componentAddress: event.componentAddress }
    });

    if (!bet) {
      throw new Error(`Bet not found for all-claimed: component=${event.componentAddress}`);
    }

    // Mark bet as fully settled
    await prisma.bet.update({
      where: { componentAddress: event.componentAddress },
      data: { status: 'SETTLED' }
    });

    await updateEventStatus(eventId, 'PROCESSED');

    // Remove all remaining claim triggers for this component
    try {
      await removeClaimTriggers(event.componentAddress);
    } catch (err) {
      logger.warn('Failed to remove claim triggers (non-fatal)', {
        componentAddress: event.componentAddress,
        error: err instanceof Error ? err.message : String(err)
      });
    }

    logger.info('BetAllPrizesClaimedEvent processed successfully', {
      eventId,
      componentAddress: event.componentAddress,
      betName: bet.name
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
