#!/usr/bin/env npx tsx
/**
 * Generate 5 test Stokenet accounts for the random bet placement job.
 * Saves keypairs to apps/radixbet-event-processor/test-stokenet-accounts.json
 *
 * Run with: npx tsx scripts/generate-test-accounts.ts
 */

import { createRandomAccount, fundFromFaucet } from '@radix-bet/radix';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_FILE = path.join(
  __dirname,
  '../apps/radixbet-event-processor/test-stokenet-accounts.json'
);
const ACCOUNT_COUNT = 5;

async function main() {
  console.log(`Generating ${ACCOUNT_COUNT} test Stokenet accounts...\n`);

  const accounts = [];

  for (let i = 0; i < ACCOUNT_COUNT; i++) {
    const { account } = await createRandomAccount();
    accounts.push({
      privateKeyHex: account.privateKeyHex,
      publicKeyHex: account.publicKeyHex,
      address: account.address,
    });
    console.log(`Account ${i + 1}: ${account.address}`);

    // Fund each account from faucet
    try {
      console.log(`  Funding from faucet...`);
      await fundFromFaucet(account.address);
      console.log(`  Funded!`);
    } catch (err) {
      console.warn(`  Faucet failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  const data = {
    description: 'Test Stokenet accounts for automated random bet placement',
    generatedAt: new Date().toISOString(),
    network: 'stokenet',
    accounts,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
  console.log(`\nSaved to ${OUTPUT_FILE}`);
}

main().catch(console.error);
