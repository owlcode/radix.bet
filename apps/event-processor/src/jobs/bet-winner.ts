import { prisma } from '@radix-bet/database';
import type { BetWinnerJobData } from '@radix-bet/types';
import { logger } from '../utils/logger.js';
import { updateEventStatus } from './utils.js';
import { removeVoteTriggers, createClaimTriggers } from '../hookah/triggers.js';

export async function processBetWinner(data: BetWinnerJobData): Promise<void> {
  const { eventId, event } = data;

  logger.info('Processing BetMarkWinnerEvent', {
    eventId,
    componentAddress: event.componentAddress,
    winningOption: event.winningOptionResourceAddress
  });

  try {
    // Find the bet
    const bet = await prisma.bet.findUnique({
      where: { componentAddress: event.componentAddress },
      include: { options: true }
    });

    if (!bet) {
      throw new Error(`Bet not found for winner marking: component=${event.componentAddress}`);
    }

    // Find the winning option
    const winningOption = bet.options.find(
      (opt) => opt.resourceAddress === event.winningOptionResourceAddress
    );

    if (!winningOption) {
      throw new Error(
        `Winning option not found: component=${event.componentAddress} resource=${event.winningOptionResourceAddress}`
      );
    }

    // Update bet status and winning option
    await prisma.bet.update({
      where: { componentAddress: event.componentAddress },
      data: {
        status: 'RESOLVED',
        winningOptionId: winningOption.id
      }
    });

    await updateEventStatus(eventId, 'PROCESSED');

    // Trigger lifecycle: remove vote triggers, create claim triggers
    try {
      await removeVoteTriggers(event.componentAddress);
      await createClaimTriggers(event.componentAddress);
    } catch (err) {
      logger.warn('Failed to update triggers after winner marked (non-fatal)', {
        componentAddress: event.componentAddress,
        error: err instanceof Error ? err.message : String(err)
      });
    }

    logger.info('BetMarkWinnerEvent processed successfully', {
      eventId,
      componentAddress: event.componentAddress,
      winningOptionId: winningOption.id
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
