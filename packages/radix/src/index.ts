// Re-export key types from Radix SDKs for consumer convenience
export type { TransactionManifest } from '@radixdlt/radix-engine-toolkit';
export type { GatewayApiClient } from '@radixdlt/babylon-gateway-api-sdk';

// Gateway
export {
  createGatewayClient,
  getGatewayClient,
  getNetworkClient,
  getCurrentStateVersion
} from './gateway.js';
export type { CreateGatewayClientOptions } from './gateway.js';

// Transactions
export {
  deriveAccount,
  createRandomAccount,
  submitTransaction,
  waitForTransaction,
  fundFromFaucet
} from './transaction.js';
export type {
  Account,
  SubmitTransactionOptions,
  WaitForTransactionOptions,
  TransactionResult,
  TransactionStatus
} from './transaction.js';

// Balance
export { getXrdBalance, getResourceBalance } from './balance.js';

// Manifests
export {
  buildCreateBetManifest,
  buildVoteManifest,
  buildClaimPrizeManifest,
  buildMarkWinnerManifest,
  buildSubmitVoteManifest
} from './manifests/index.js';
export type {
  CreateBetParams,
  VoteManifestParams,
  ClaimPrizeManifestParams,
  MarkWinnerManifestParams,
  SubmitVoteManifestParams
} from './manifests/index.js';

// SBOR
export { mapHookahEvent } from './sbor/index.js';
