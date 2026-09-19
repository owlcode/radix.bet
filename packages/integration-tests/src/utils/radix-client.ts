/**
 * Radix Stokenet Client Utilities for Integration Tests
 * Delegates to @radix-bet/radix for all Radix operations.
 */

import {
  createGatewayClient,
  createRandomAccount,
  submitTransaction,
  waitForTransaction as sharedWaitForTransaction,
  fundFromFaucet as sharedFundFromFaucet,
  getXrdBalance,
  getResourceBalance as sharedGetResourceBalance,
  buildCreateBetManifest,
  buildVoteManifest,
  buildMarkWinnerManifest,
  buildClaimPrizeManifest,
  type Account,
  type TransactionStatus
} from '@radix-bet/radix';
import { getXrdAddress, getNetwork, getNetworkConfig } from '@radix-bet/config';

export { type Account, type TransactionStatus };

// Stokenet configuration — from @radix-bet/config
const networkConfig = getNetworkConfig();
export const NETWORK_ID = networkConfig.networkId;
export const PACKAGE_ADDRESS =
  'package_tdx_2_1p5rwekl2l3ehwhws53cl37vf6wqtxjudr9a2krtvlquk80y84zjqay';
export const XRD_ADDRESS = getXrdAddress(getNetwork());

// Initialize Gateway client
export const gateway = createGatewayClient({ appName: 'radix-bet-integration-tests' });

export type TestWallet = Account;

/**
 * Generate a new test wallet with Ed25519 keypair
 */
export async function createTestWallet(): Promise<TestWallet> {
  const { account } = await createRandomAccount();
  return account;
}

/**
 * Get XRD balance for an account
 */
export async function getBalance(address: string): Promise<number> {
  return getXrdBalance(address, gateway);
}

/**
 * Get balance of a specific fungible resource in an account
 */
export async function getResourceBalance(
  address: string,
  resourceAddress: string
): Promise<number> {
  return sharedGetResourceBalance(address, resourceAddress, gateway);
}

/**
 * Fund account from Stokenet faucet using radix-web3.js's built-in faucet manifest.
 */
export async function fundFromFaucet(wallet: TestWallet): Promise<void> {
  await sharedFundFromFaucet(wallet.address, gateway);
}

export interface CreateBetParams {
  name: string;
  options: { name: string; image: string }[];
  deadlineTimestamp: number;
}

/**
 * Create a bet on-chain
 */
export async function createBetTransaction(
  wallet: TestWallet,
  params: CreateBetParams
): Promise<string> {
  const manifest = buildCreateBetManifest({
    accountAddress: wallet.address,
    packageAddress: PACKAGE_ADDRESS,
    betName: params.name,
    optionNames: params.options.map((o) => o.name),
    optionImages: params.options.map((o) => o.image),
    deadlineUnixSeconds: params.deadlineTimestamp
  });

  return submitTransaction(wallet.privateKeyHex, manifest, { gateway });
}

/**
 * Place a vote on a bet option
 */
export async function voteTransaction(
  wallet: TestWallet,
  componentAddress: string,
  optionName: string,
  amount: number,
  currency?: string
): Promise<string> {
  const manifest = buildVoteManifest({
    accountAddress: wallet.address,
    componentAddress,
    optionName,
    amount,
    currency
  });

  return submitTransaction(wallet.privateKeyHex, manifest, { gateway });
}

/**
 * Mark winning option on a bet
 */
export async function markWinnerTransaction(
  wallet: TestWallet,
  componentAddress: string,
  ownerBadgeAddress: string,
  winningOption: string
): Promise<string> {
  const manifest = buildMarkWinnerManifest({
    accountAddress: wallet.address,
    componentAddress,
    ownerBadgeAddress,
    winningOption
  });

  return submitTransaction(wallet.privateKeyHex, manifest, { gateway });
}

/**
 * Claim prize
 */
export async function claimPrizeTransaction(
  wallet: TestWallet,
  componentAddress: string,
  optionTokenAddress: string,
  amount: number
): Promise<string> {
  const manifest = buildClaimPrizeManifest({
    accountAddress: wallet.address,
    componentAddress,
    optionTokenAddress,
    amount
  });

  return submitTransaction(wallet.privateKeyHex, manifest, { gateway });
}

export interface TransactionResult {
  status: TransactionStatus;
  componentAddress?: string;
  optionAddresses?: string[];
  ownerBadgeAddress?: string;
  newFungibleAddresses?: string[];
  errorMessage?: string;
  stateVersion?: number;
}

/**
 * Wait for transaction confirmation and extract results
 */
export async function waitForTransaction(
  txHash: string,
  maxAttempts: number = 60,
  intervalMs: number = 3000
): Promise<TransactionResult> {
  const result = await sharedWaitForTransaction(txHash, {
    gateway,
    maxAttempts,
    intervalMs
  });

  if (result.status === 'CommittedSuccess') {
    const componentAddress = result.newEntities.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any) => e.entity_type === 'GlobalGenericComponent'
    )?.entity_address;

    const allFungibles = result.newEntities
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((e: any) => e.entity_type === 'GlobalFungibleResource')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((e: any) => e.entity_address);

    const ownerBadgeAddress = allFungibles.length > 0 ? allFungibles[0] : undefined;
    const optionAddresses = allFungibles.length > 1 ? allFungibles.slice(1) : [];

    return {
      status: 'CommittedSuccess',
      componentAddress,
      optionAddresses,
      ownerBadgeAddress,
      newFungibleAddresses: allFungibles
    };
  }

  return {
    status: result.status,
    errorMessage: result.errorMessage
  };
}

/**
 * Get component state from gateway
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getComponentState(componentAddress: string): Promise<any> {
  try {
    const response = await gateway.state.getEntityDetailsVaultAggregated(componentAddress);
    return response;
  } catch {
    return null;
  }
}

/**
 * Helper to wait for a specific number of seconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
