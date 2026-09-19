import { prisma } from '@radix-bet/database';
import type { BetWinnerVoteJobData } from '@radix-bet/types';
import { logger } from '../utils/logger.js';
import { updateEventStatus } from './utils.js';

export async function processBetWinnerVote(data: BetWinnerVoteJobData): Promise<void> {
  const { eventId, event } = data;
  const { componentAddress, optionResourceAddress, voter } = event;

  logger.info('Processing BetWinnerVoteEvent', {
    eventId,
    componentAddress,
    option: optionResourceAddress,
    voter
  });

  try {
    // Find the bet
    const bet = await prisma.bet.findUnique({
      where: { componentAddress }
    });

    if (!bet) {
      // Throw so BullMQ retries — the bet may not have been created yet (race condition)
      throw new Error(`Bet not found for verifier vote: component=${componentAddress}`);
    }

    // Record the verifier vote (upsert to handle replays)
    await prisma.verifierVote.upsert({
      where: {
        componentAddress_voterNftId: {
          componentAddress,
          voterNftId: voter
        }
      },
      update: {
        optionResource: optionResourceAddress
      },
      create: {
        componentAddress,
        optionResource: optionResourceAddress,
        voterNftId: voter
      }
    });

    // Count votes for monitoring
    const voteCount = await prisma.verifierVote.count({
      where: { componentAddress }
    });

    await updateEventStatus(eventId, 'PROCESSED');

    logger.info('BetWinnerVoteEvent processed', {
      eventId,
      componentAddress,
      voter,
      totalVotes: voteCount
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
