#!/usr/bin/env bun
/**
 * Simple script to create a new Radix Stokenet account and claim free XRD
 *
 * Run with: bun run scripts/claim-faucet.ts
 * Options:
 *   --existing  Use most recent saved account instead of creating new
 */

import {
  createRandomAccount,
  fundFromFaucet,
  getXrdBalance,
  createGatewayClient
} from '@radix-bet/radix';
import * as fs from 'fs';
import * as path from 'path';

// File to store test accounts
const ACCOUNTS_FILE = path.join(__dirname, '.test-accounts.json');

const gateway = createGatewayClient({ appName: 'radix-bet-faucet-script' });

interface TestAccount {
  privateKeyHex: string;
  publicKeyHex: string;
  address: string;
  createdAt: string;
}

interface AccountsStore {
  accounts: TestAccount[];
}

async function createAccount(): Promise<TestAccount> {
  console.log('Creating new account...');

  const { account } = await createRandomAccount();

  const testAccount: TestAccount = {
    ...account,
    createdAt: new Date().toISOString()
  };

  console.log(`Account created: ${account.address}`);
  return testAccount;
}

async function getBalance(address: string): Promise<number> {
  return getXrdBalance(address, gateway);
}

function saveAccount(account: TestAccount): void {
  let store: AccountsStore = { accounts: [] };

  if (fs.existsSync(ACCOUNTS_FILE)) {
    const content = fs.readFileSync(ACCOUNTS_FILE, 'utf-8');
    store = JSON.parse(content);
  }

  store.accounts.push(account);
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(store, null, 2));
  console.log(`Account saved to ${ACCOUNTS_FILE}`);
}

function loadAccounts(): TestAccount[] {
  if (!fs.existsSync(ACCOUNTS_FILE)) {
    return [];
  }
  const content = fs.readFileSync(ACCOUNTS_FILE, 'utf-8');
  const store: AccountsStore = JSON.parse(content);
  return store.accounts;
}

async function main() {
  console.log('Radix Stokenet Faucet Claim Script\n');

  // Check if we should use an existing account
  const args = process.argv.slice(2);
  let account: TestAccount;

  if (args.includes('--existing')) {
    const accounts = loadAccounts();
    if (accounts.length === 0) {
      console.log('No existing accounts found. Creating new one...');
      account = await createAccount();
      saveAccount(account);
    } else {
      account = accounts[accounts.length - 1];
      console.log(`Using existing account: ${account.address}`);
    }
  } else {
    account = await createAccount();
    saveAccount(account);
  }

  // Check initial balance
  const initialBalance = await getBalance(account.address);
  console.log(`Initial balance: ${initialBalance} XRD`);

  // Claim from faucet
  try {
    console.log('Claiming from faucet...');
    await fundFromFaucet(account.address, gateway);
    console.log('Faucet claim submitted and confirmed!');

    // Check final balance
    const finalBalance = await getBalance(account.address);
    console.log(`Final balance: ${finalBalance} XRD`);
    console.log(`Received: ${finalBalance - initialBalance} XRD`);
  } catch (error) {
    console.error('Error:', error);
  }

  console.log('\nAccount details:');
  console.log(`   Address: ${account.address}`);
  console.log(`   Private Key: ${account.privateKeyHex}`);
  console.log(
    `\nView on explorer: https://stokenet-dashboard.radixdlt.com/account/${account.address}`
  );
}

main().catch(console.error);
