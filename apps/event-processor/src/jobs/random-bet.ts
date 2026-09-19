import { prisma } from '@radix-bet/database';
import {
  deriveAccount,
  fundFromFaucet,
  getXrdBalance,
  buildVoteManifest,
  submitTransaction,
} from '@radix-bet/radix';
import { isStokenet } from '@radix-bet/config';
import { logger } from '../utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';

const TEST_ACCOUNTS_FILE = path.join(
  process.cwd(),
  'test-stokenet-accounts.json'
);

const MIN_XRD_BALANCE = 50;
const MIN_BET_XRD = 5;
const MAX_BET_XRD = 100;

function randomBetAmount(): number {
  return Math.floor(Math.random() * (MAX_BET_XRD - MIN_BET_XRD + 1)) + MIN_BET_XRD;
}

interface TestAccount {
  privateKeyHex: string;
  publicKeyHex: string;
  address: string;
}

function loadOrCreateTestAccounts(): TestAccount[] {
  if (fs.existsSync(TEST_ACCOUNTS_FILE)) {
    const data = JSON.parse(fs.readFileSync(TEST_ACCOUNTS_FILE, 'utf-8'));
    return data.accounts;
  }
  return [];
}

const VOTES_PER_RUN = 5;

export async function processRandomBet(): Promise<void> {
  if (!isStokenet()) {
    logger.info('[RandomBet] Not on Stokenet, skipping');
    return;
  }

  const accounts = loadOrCreateTestAccounts();
  if (accounts.length === 0) {
    logger.warn('[RandomBet] No test accounts found. Run the generate-test-accounts script first.');
    return;
  }

  // Find active bets with options
  const activeBets = await prisma.bet.findMany({
    where: {
      status: 'ACTIVE',
      deadline: { gt: new Date().toISOString() },
    },
    include: { options: true },
    take: 20,
  });

  if (activeBets.length === 0) {
    logger.info('[RandomBet] No active bets to place bets on');
    return;
  }

  for (let i = 0; i < VOTES_PER_RUN; i++) {
    // Pick a random bet and option
    const bet = activeBets[Math.floor(Math.random() * activeBets.length)];
    if (bet.options.length === 0) continue;

    const option = bet.options[Math.floor(Math.random() * bet.options.length)];

    // Pick a random test account
    const account = accounts[Math.floor(Math.random() * accounts.length)];

    try {
      const { account: derived } = await deriveAccount(account.privateKeyHex);

      // Fund if needed
      const balance = await getXrdBalance(derived.address);
      if (balance < MIN_XRD_BALANCE) {
        logger.info(`[RandomBet] Account ${derived.address.slice(0, 20)}... low balance (${balance}), funding...`);
        await fundFromFaucet(derived.address);
      }

      const amount = randomBetAmount();
      const manifest = buildVoteManifest({
        accountAddress: derived.address,
        componentAddress: bet.componentAddress,
        optionName: option.name,
        amount,
        currency: bet.currency ?? undefined,
      });

      const txHash = await submitTransaction(account.privateKeyHex, manifest);
      logger.info(`[RandomBet] [${i + 1}/${VOTES_PER_RUN}] Placed ${amount} XRD on "${option.name}" for "${bet.name}" (TX: ${txHash})`);
    } catch (err) {
      logger.error(`[RandomBet] [${i + 1}/${VOTES_PER_RUN}] Failed to place bet on "${bet.name}":`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
