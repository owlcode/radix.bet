import { prisma } from '@radix-bet/database';
import type { BetVoteJobData } from '@radix-bet/types';
import { logger } from '../utils/logger.js';
import { updateEventStatus } from './utils.js';

export async function processBetVote(data: BetVoteJobData): Promise<void> {
  const { eventId, event } = data;

  logger.info('Processing BetVoteEvent', {
    eventId,
    componentAddress: event.componentAddress,
    option: event.optionResourceAddress,
    amount: event.amount
  });

  try {
    // Find the bet option
    const option = await prisma.betOption.findFirst({
      where: {
        componentAddress: event.componentAddress,
        resourceAddress: event.optionResourceAddress
      }
    });

    if (!option) {
      // Throw so BullMQ retries — the option may not have been synced yet (race condition)
      throw new Error(
        `Bet option not found: component=${event.componentAddress} resource=${event.optionResourceAddress}`
      );
    }

    // Look up VoteIntent by transactionId (may not exist for direct on-chain votes)
    const voteIntent = await prisma.voteIntent.findUnique({
      where: { transactionId: event.transactionId }
    });

    // Create individual Vote record, linking VoteIntent if found
    await prisma.vote.upsert({
      where: { transactionId: event.transactionId },
      update: {},
      create: {
        componentAddress: event.componentAddress,
        optionAddress: event.optionResourceAddress,
        amount: parseFloat(event.amount),
        transactionId: event.transactionId,
        stateVersion: BigInt(event.stateVersion),
        voteIntentId: voteIntent?.id ?? null
      }
    });

    // Mark VoteIntent as matched if linked
    if (voteIntent && !voteIntent.matched) {
      try {
        await prisma.voteIntent.update({
          where: { id: voteIntent.id },
          data: { matched: true }
        });
      } catch {
        // Concurrent match from confirm endpoint — safe to ignore
      }
    }

    // Atomic increment to prevent race conditions with concurrent workers
    const voteAmount = Math.floor(parseFloat(event.amount));
    await prisma.$executeRaw`
      UPDATE "BetOption"
      SET "totalVotes" = (CAST("totalVotes" AS BIGINT) + ${BigInt(voteAmount)})::TEXT
      WHERE "id" = ${option.id}
    `;

    await updateEventStatus(eventId, 'PROCESSED');

    logger.info('BetVoteEvent processed successfully', {
      eventId,
      optionId: option.id,
      voteAmount: voteAmount.toString()
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
