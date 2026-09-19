import { createWorker, initializeQueues, type Job, type Worker } from '@radix-bet/queue';
import type {
  BetCreatedJobData,
  BetVoteJobData,
  BetWinnerJobData,
  BetClaimJobData,
  BetAllClaimedJobData,
  BetWinnerVoteJobData
} from '@radix-bet/types';
import { processBetCreated } from './bet-created.js';
import { processBetVote } from './bet-vote.js';
import { processBetWinner } from './bet-winner.js';
import { processBetClaim } from './bet-claim.js';
import { processBetAllClaimed } from './bet-all-claimed.js';
import { processBetWinnerVote } from './bet-winner-vote.js';
import { logger } from '../utils/logger.js';

let workers: Worker[] = [];

export function startJobProcessors(): void {
  logger.info('Starting job processors...');

  // Initialize queues first
  initializeQueues();

  // Create workers for each queue
  workers = [
    createWorker<BetCreatedJobData>(
      'bet-created',
      async (job: Job<BetCreatedJobData>) => {
        await processBetCreated(job.data);
      },
      { concurrency: 5 }
    ),

    createWorker<BetVoteJobData>(
      'bet-vote',
      async (job: Job<BetVoteJobData>) => {
        await processBetVote(job.data);
      },
      { concurrency: 10 }
    ),

    createWorker<BetWinnerJobData>(
      'bet-winner',
      async (job: Job<BetWinnerJobData>) => {
        await processBetWinner(job.data);
      },
      { concurrency: 5 }
    ),

    createWorker<BetClaimJobData>(
      'bet-claim',
      async (job: Job<BetClaimJobData>) => {
        await processBetClaim(job.data);
      },
      { concurrency: 5 }
    ),

    createWorker<BetAllClaimedJobData>(
      'bet-all-claimed',
      async (job: Job<BetAllClaimedJobData>) => {
        await processBetAllClaimed(job.data);
      },
      { concurrency: 5 }
    ),

    createWorker<BetWinnerVoteJobData>(
      'bet-winner-vote',
      async (job: Job<BetWinnerVoteJobData>) => {
        await processBetWinnerVote(job.data);
      },
      { concurrency: 5 }
    )
  ];

  logger.info('Job processors started', { workerCount: workers.length });
}

export async function stopJobProcessors(): Promise<void> {
  logger.info('Stopping job processors...');

  await Promise.all(workers.map((worker) => worker.close()));
  workers = [];

  logger.info('Job processors stopped');
}
