#!/usr/bin/env bun
/**
 * Deploy Scrypto package to Stokenet
 *
 * This script:
 * 1. Creates or loads a deployer account
 * 2. Claims XRD from faucet if needed
 * 3. Publishes the compiled WASM package to Stokenet
 *
 * Run with: bun run scripts/deploy-scrypto.ts
 *
 * Required: DEPLOYER_PRIVATE_KEY env var (or will create new account)
 */

import {
  createGatewayClient,
  deriveAccount,
  createRandomAccount,
  submitTransaction as sharedSubmitTransaction,
  waitForTransaction as sharedWaitForTransaction,
  fundFromFaucet as sharedFundFromFaucet,
  getXrdBalance,
  type Account,
  type TransactionManifest
} from '@radix-bet/radix';
import * as fs from 'fs';
import * as path from 'path';

const SCRYPTO_DIR = path.join(__dirname, '..', 'scrypto');
const WASM_PATH = path.join(
  SCRYPTO_DIR,
  'target',
  'wasm32-unknown-unknown',
  'release',
  'owl_bets.wasm'
);
const RPD_PATH = path.join(
  SCRYPTO_DIR,
  'target',
  'wasm32-unknown-unknown',
  'release',
  'owl_bets.rpd'
);

const gateway = createGatewayClient({ appName: 'radix-bet-deploy' });

async function getOrCreateDeployer(): Promise<{ account: Account }> {
  const envKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (envKey) {
    console.log('Using deployer account from environment...');
    return deriveAccount(envKey);
  }

  console.log('Creating new deployer account...');
  return createRandomAccount();
}

async function getBalance(address: string): Promise<number> {
  return getXrdBalance(address, gateway);
}

async function publishPackage(account: Account): Promise<string> {
  console.log('Publishing package to Stokenet...');

  // Read compiled WASM and RPD
  if (!fs.existsSync(WASM_PATH)) {
    throw new Error(`WASM not found at ${WASM_PATH}. Run 'scrypto build' first.`);
  }
  if (!fs.existsSync(RPD_PATH)) {
    throw new Error(`RPD not found at ${RPD_PATH}. Run 'scrypto build' first.`);
  }

  const wasmCode = fs.readFileSync(WASM_PATH);
  const rpdCode = fs.readFileSync(RPD_PATH);

  console.log(`WASM size: ${wasmCode.length} bytes`);
  console.log(`RPD size: ${rpdCode.length} bytes`);

  // Create publish package manifest
  const wasmHex = wasmCode.toString('hex');

  const manifest: TransactionManifest = {
    instructions: {
      kind: 'String',
      value: `
        PUBLISH_PACKAGE_ADVANCED
          Enum<0u8>()
          Tuple(
            Map<String, Tuple>()
          )
          Blob("${wasmHex}")
          Map<String, Tuple>()
          None
        ;
        CALL_METHOD
          Address("${account.address}")
          "deposit_batch"
          Expression("ENTIRE_WORKTOP")
        ;
      `
    },
    blobs: [new Uint8Array(wasmCode)]
  };

  const txHash = await sharedSubmitTransaction(account.privateKeyHex, manifest, { gateway });
  console.log(`Publish TX: ${txHash}`);

  const result = await sharedWaitForTransaction(txHash, { gateway, maxAttempts: 60 });

  if (result.status === 'CommittedSuccess') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const packageAddress = result.newEntities.find(
      (e: any) => e.entity_type === 'GlobalPackage'
    )?.entity_address;

    console.log(`\nPackage published: ${packageAddress}`);
    return packageAddress || '';
  }

  console.log(`\nPublish failed: ${result.status}`);
  return '';
}

async function main() {
  console.log('🚀 Scrypto Package Deployment to Stokenet\n');

  // Get or create deployer account
  const { account } = await getOrCreateDeployer();
  console.log(`Deployer: ${account.address}`);

  // Check balance and fund if needed
  let balance = await getBalance(account.address);
  console.log(`Balance: ${balance} XRD`);

  if (balance < 100) {
    console.log('Claiming XRD from faucet...');
    await sharedFundFromFaucet(account.address, gateway);
    balance = await getBalance(account.address);
    console.log(`Faucet funded: ${balance} XRD`);
  }

  // Publish package
  const packageAddress = await publishPackage(account);

  if (packageAddress) {
    console.log('\n📋 Deployment Summary:');
    console.log(`   Package Address: ${packageAddress}`);
    console.log(`   Deployer Address: ${account.address}`);
    console.log(`   Deployer Private Key: ${account.privateKeyHex}`);
    console.log(
      `\n🔗 View on explorer: https://stokenet-dashboard.radixdlt.com/package/${packageAddress}`
    );

    // Save to file for reference
    const deploymentInfo = {
      packageAddress,
      deployerAddress: account.address,
      deployedAt: new Date().toISOString(),
      network: 'stokenet'
    };
    fs.writeFileSync(
      path.join(__dirname, '.deployment-info.json'),
      JSON.stringify(deploymentInfo, null, 2)
    );
  }
}

main().catch(console.error);
