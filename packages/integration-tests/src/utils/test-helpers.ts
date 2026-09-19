/**
 * Shared test helpers to reduce duplication across integration test suites
 */

import { expect } from 'vitest';
import {
  createTestWallet,
  getBalance,
  fundFromFaucet,
  voteTransaction,
  waitForTransaction,
  getResourceBalance,
  TestWallet
} from './radix-client';

/**
 * Create and fund N wallets from the Stokenet faucet.
 * Wallets are created in parallel, then funded sequentially (faucet rate-limits).
 */
export async function createAndFundWallets(count: number): Promise<TestWallet[]> {
  const wallets = await Promise.all(Array.from({ length: count }, () => createTestWallet()));

  for (const wallet of wallets) {
    expect(wallet.address).toMatch(/^account_tdx_2_/);
  }

  // Fund sequentially to avoid faucet rate limiting
  for (const wallet of wallets) {
    await fundFromFaucet(wallet);
  }

  const balances = await Promise.all(wallets.map((w) => getBalance(w.address)));

  for (const balance of balances) {
    expect(balance).toBeGreaterThan(0);
  }

  console.log(
    `  Created & funded ${count} wallets: ${wallets.map((w, i) => `${w.address.slice(0, 20)}...=${balances[i]}`).join(', ')}`
  );
  return wallets;
}

/**
 * Place a vote and verify the voter received the expected option tokens.
 * Returns the transaction result.
 */
export async function voteAndVerify(
  wallet: TestWallet,
  componentAddress: string,
  optionName: string,
  amount: number,
  optionTokenAddress: string,
  label?: string
) {
  const txHash = await voteTransaction(wallet, componentAddress, optionName, amount);
  const result = await waitForTransaction(txHash);
  expect(result.status).toBe('CommittedSuccess');

  const balance = await getResourceBalance(wallet.address, optionTokenAddress);
  expect(balance).toBe(amount);

  console.log(`  ${label || 'Voter'}: ${amount} ${optionName} tokens (balance=${balance})`);
  return result;
}
