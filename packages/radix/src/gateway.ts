/**
 * Gateway and network client factories.
 * Uses radix-web3.js's createRadixNetworkClient for state queries,
 * and GatewayApiClient for the underlying API connection.
 */

import { GatewayApiClient } from '@radixdlt/babylon-gateway-api-sdk';
import { createRadixNetworkClient, type RadixNetworkClient } from 'radix-web3.js';
import { getNetworkConfig } from '@radix-bet/config';

let defaultClient: GatewayApiClient | null = null;
let defaultNetworkClient: RadixNetworkClient | null = null;

export interface CreateGatewayClientOptions {
  appName?: string;
  fetchApi?: typeof fetch;
}

/**
 * Create a new GatewayApiClient using network config from @radix-bet/config.
 * Uses RADIX_NETWORK env var to determine stokenet/mainnet.
 */
export function createGatewayClient(options?: CreateGatewayClientOptions): GatewayApiClient {
  const config = getNetworkConfig();
  return GatewayApiClient.initialize({
    networkId: config.networkId,
    applicationName: options?.appName ?? 'radix-bet',
    applicationVersion: '1.0.0',
    ...(options?.fetchApi ? { fetchApi: options.fetchApi } : {})
  });
}

/**
 * Get a singleton gateway client (for server-side / event-processor use).
 * For web apps that need custom fetch, use createGatewayClient() directly.
 */
export function getGatewayClient(): GatewayApiClient {
  if (!defaultClient) {
    defaultClient = createGatewayClient();
  }
  return defaultClient;
}

/**
 * Get a singleton radix-web3.js network client.
 * Provides: pollTransactionStatus, getCurrentStateVersion, getFungibleTokens, etc.
 */
export function getNetworkClient(): RadixNetworkClient {
  if (!defaultNetworkClient) {
    const config = getNetworkConfig();
    defaultNetworkClient = createRadixNetworkClient({
      gatewayApiClient: getGatewayClient(),
      networkId: config.networkId
    });
  }
  return defaultNetworkClient;
}

/**
 * Get the current state version from the gateway.
 * Delegates to radix-web3.js's networkClient.getCurrentStateVersion().
 */
export async function getCurrentStateVersion(): Promise<number> {
  return getNetworkClient().getCurrentStateVersion();
}
