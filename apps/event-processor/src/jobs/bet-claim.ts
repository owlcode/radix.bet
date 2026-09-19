import { prisma } from '@radix-bet/database';
import type { BetClaimJobData } from '@radix-bet/types';
import { logger } from '../utils/logger.js';
import { updateEventStatus } from './utils.js';

export async function processBetClaim(data: BetClaimJobData): Promise<void> {
  const { eventId, event } = data;

  logger.info('Processing BetPrizeClaimedEvent', {
    eventId,
    componentAddress: event.componentAddress,
    amount: event.amount
  });

  try {
    const bet = await prisma.bet.findUnique({
      where: { componentAddress: event.componentAddress }
    });

    if (!bet) {
      logger.warn('Bet not found for claim', {
        componentAddress: event.componentAddress
      });
    } else {
      logger.info('Prize claimed on bet', {
        betName: bet.name,
        amount: event.amount
      });
    }

    await updateEventStatus(eventId, 'PROCESSED');

    logger.info('BetPrizeClaimedEvent processed successfully', { eventId });
  } catch (error) {
    await updateEventStatus(
      eventId,
      'FAILED',
      error instanceof Error ? error.message : 'Unknown error'
    );
    throw error;
  }
}
