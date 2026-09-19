/**
 * Balance query utilities using radix-web3.js's network client.
 */

import { createRadixNetworkClient } from 'radix-web3.js';
import { GatewayApiClient } from '@radixdlt/babylon-gateway-api-sdk';
import { getXrdAddress, getNetwork, getNetworkConfig } from '@radix-bet/config';
import { getNetworkClient } from './gateway.js';

/**
 * Get a network client, using the provided gateway or the default singleton.
 */
function resolveNetworkClient(gateway?: GatewayApiClient) {
  if (!gateway) return getNetworkClient();
  const config = getNetworkConfig();
  return createRadixNetworkClient({ gatewayApiClient: gateway, networkId: config.networkId });
}

/**
 * Get XRD balance for an account address.
 */
export async function getXrdBalance(address: string, gateway?: GatewayApiClient): Promise<number> {
  return getResourceBalance(address, getXrdAddress(getNetwork()), gateway);
}

/**
 * Get the balance of a specific fungible resource in an account.
 */
export async function getResourceBalance(
  address: string,
  resourceAddress: string,
  gateway?: GatewayApiClient
): Promise<number> {
  try {
    const client = resolveNetworkClient(gateway);
    const tokens = await client.getFungibleTokens(address);
    const match = tokens.find((t) => t.resourceAddress === resourceAddress);
    return match ? parseFloat(match.amount) : 0;
  } catch {
    return 0;
  }
}
