import { createWorker, addJob, getQueue, type Worker } from '@radix-bet/queue';
import {
  QUEUE_NAMES,
  type OracleFetchJobData,
  type OracleCreateBetJobData,
  type OracleResolveBetJobData,
  type FaucetClaimJobData,
  type RandomBetJobData,
} from '@radix-bet/types';
import { isStokenet } from '@radix-bet/config';
import { getConfig } from '../config/runtime-config.js';
import { ALL_ORACLES } from './configs.js';
import { processFetchGames } from './fetch-games.js';
import { processCreateBet } from './create-bet.js';
import { processResolveBet } from './resolve-bet.js';
import { processFaucetClaim } from '../jobs/faucet-claim.js';
import { processRandomBet } from '../jobs/random-bet.js';

const workers: Worker[] = [];
const fetchIntervals: ReturnType<typeof setInterval>[] = [];

export async function startOracleEngine(): Promise<void> {
  console.log('[OracleEngine] Starting oracle engine...');

  // Create workers for oracle queues
  const fetchWorker = createWorker<OracleFetchJobData>(
    QUEUE_NAMES.ORACLE_FETCH,
    async (job) => {
      await processFetchGames(job.data.oracleId);
    },
    { concurrency: 2 },
  );
  workers.push(fetchWorker);

  const createBetWorker = createWorker<OracleCreateBetJobData>(
    QUEUE_NAMES.ORACLE_CREATE_BET,
    async (job) => {
      const enabled = await getConfig('oracle:create:enabled');
      if (enabled === 'false') {
        console.log(`[OracleEngine] Oracle create-bet disabled, skipping job ${job.id}`);
        return;
      }
      await processCreateBet(job.data.oracleId, job.data.oracleGameId);
    },
    { concurrency: 3 },
  );
  workers.push(createBetWorker);

  const resolveWorker = createWorker<OracleResolveBetJobData>(
    QUEUE_NAMES.ORACLE_RESOLVE_BET,
    async (job) => {
      const enabled = await getConfig('oracle:resolve:enabled');
      if (enabled === 'false') {
        console.log(`[OracleEngine] Oracle resolve-bet disabled, skipping job ${job.id}`);
        return;
      }
      await processResolveBet(job.data.oracleId, job.data.oracleGameId, job.data.espnEventId);
    },
    { concurrency: 3 },
  );
  workers.push(resolveWorker);

  // Schedule recurring fetch jobs for each oracle
  for (const oracle of ALL_ORACLES) {
    const privateKey = process.env[oracle.privateKeyEnvVar];
    if (!privateKey) {
      console.warn(`[OracleEngine] ${oracle.privateKeyEnvVar} not set, skipping ${oracle.displayName}`);
      continue;
    }

    // Recurring fetch
    const interval = setInterval(async () => {
      try {
        const enabled = await getConfig('oracle:fetch:enabled');
        if (enabled === 'false') {
          console.log(`[OracleEngine] Oracle fetch disabled, skipping ${oracle.displayName}`);
          return;
        }
        await addJob<OracleFetchJobData>(QUEUE_NAMES.ORACLE_FETCH, { oracleId: oracle.id });
      } catch (e) {
        console.error(`[OracleEngine] Recurring fetch failed for ${oracle.displayName}:`, e);
      }
    }, oracle.fetchIntervalMs);
    fetchIntervals.push(interval);

    console.log(`[OracleEngine] ${oracle.displayName} scheduled (every ${oracle.fetchIntervalMs / 60000}min)`);
  }

  // Faucet claim worker — keeps oracle accounts funded on Stokenet
  if (isStokenet()) {
    const faucetWorker = createWorker<FaucetClaimJobData>(
      QUEUE_NAMES.FAUCET_CLAIM,
      async () => { await processFaucetClaim(); },
      { concurrency: 1 },
    );
    workers.push(faucetWorker);

    const faucetQueue = getQueue(QUEUE_NAMES.FAUCET_CLAIM);
    await faucetQueue.add('faucet-claim', { type: 'faucet-claim' as const }, {
      repeat: { every: 60 * 60 * 1000 },
      jobId: 'faucet-claim-hourly',
    });
    console.log('[OracleEngine] Faucet claim scheduled (every 60min)');

    // Random bet worker — places test bets on active markets
    const randomBetWorker = createWorker<RandomBetJobData>(
      QUEUE_NAMES.RANDOM_BET,
      async () => { await processRandomBet(); },
      { concurrency: 1 },
    );
    workers.push(randomBetWorker);

    const randomBetQueue = getQueue(QUEUE_NAMES.RANDOM_BET);
    await randomBetQueue.add('random-bet', { type: 'random-bet' as const }, {
      repeat: { every: 60 * 60 * 1000 },
      jobId: 'random-bet-60min',
    });
    console.log('[OracleEngine] Random bet scheduled (every 60min, 5 votes per run)');
  }

  console.log('[OracleEngine] Oracle engine started');
}

export async function stopOracleEngine(): Promise<void> {
  for (const interval of fetchIntervals) clearInterval(interval);
  fetchIntervals.length = 0;
  await Promise.all(workers.map((w) => w.close()));
  workers.length = 0;
  console.log('[OracleEngine] Oracle engine stopped');
}
