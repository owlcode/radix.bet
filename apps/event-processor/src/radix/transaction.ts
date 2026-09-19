/**
 * Radix transaction helpers for the event-processor.
 * Seeder account management is local; transaction submission delegates to @radix-bet/radix.
 */

import {
  deriveAccount,
  submitTransaction as sharedSubmitTransaction,
  waitForTransaction as sharedWaitForTransaction,
  buildCreateBetManifest,
  type Account,
  type TransactionManifest
} from '@radix-bet/radix';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export { type Account, buildCreateBetManifest } from '@radix-bet/radix';

let cachedAccount: { account: Account } | null = null;

/**
 * Load the Ed25519 seeder account from SEEDER_PRIVATE_KEY env var.
 * Caches result after first call.
 */
export async function getSeederAccount(): Promise<{ account: Account }> {
  if (cachedAccount) return cachedAccount;

  const privateKeyHex = config.SEEDER_PRIVATE_KEY;
  if (!privateKeyHex) {
    throw new Error('SEEDER_PRIVATE_KEY is not set — cannot create on-chain transactions');
  }

  const { account } = await deriveAccount(privateKeyHex);
  cachedAccount = { account };

  logger.info('Loaded seeder account', { address: account.address.slice(0, 30) + '...' });
  return cachedAccount;
}

/**
 * Submit a transaction manifest signed by the seeder account.
 * Returns the intent hash (TX ID).
 */
export async function submitTransaction(manifest: TransactionManifest): Promise<string> {
  const { account } = await getSeederAccount();
  const txHash = await sharedSubmitTransaction(account.privateKeyHex, manifest);
  logger.info('Transaction submitted', { txHash });
  return txHash;
}

/**
 * Poll the gateway until the transaction is committed.
 * Returns new global entities created by the transaction.
 */
export async function waitForTransaction(
  txHash: string,
  maxAttempts = 60
): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newEntities: Array<Record<string, any>>;
}> {
  const result = await sharedWaitForTransaction(txHash, { maxAttempts });

  if (result.status === 'CommittedSuccess') {
    return { newEntities: result.newEntities };
  }

  if (result.status === 'CommittedFailure' || result.status === 'Rejected') {
    throw new Error(`Transaction failed: ${result.status}`);
  }

  throw new Error(`Transaction ${txHash} did not confirm in time`);
}
