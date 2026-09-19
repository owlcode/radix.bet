import type { RadixNetwork } from './env';

export interface NetworkConfig {
  networkId: number;
  gatewayUrl: string;
  explorerUrl: string;
  faucetUrl?: string;
}

export const networks: Record<RadixNetwork, NetworkConfig> = {
  stokenet: {
    networkId: 2,
    gatewayUrl: 'https://stokenet.radixdlt.com',
    explorerUrl: 'https://stokenet-dashboard.radixdlt.com',
    faucetUrl: 'https://stokenet.radixdlt.com/faucet'
  },
  mainnet: {
    networkId: 1,
    gatewayUrl: 'https://mainnet.radixdlt.com',
    explorerUrl: 'https://dashboard.radixdlt.com'
  }
};

export function getNetworkConfig(network?: RadixNetwork): NetworkConfig {
  const net = network || (process.env.RADIX_NETWORK as RadixNetwork) || 'stokenet';
  return networks[net];
}

export function getGatewayUrl(network?: RadixNetwork): string {
  return getNetworkConfig(network).gatewayUrl;
}

export function getNetworkId(network?: RadixNetwork): number {
  return getNetworkConfig(network).networkId;
}

export function getExplorerUrl(network?: RadixNetwork): string {
  return getNetworkConfig(network).explorerUrl;
}

export function getTransactionUrl(txId: string, network?: RadixNetwork): string {
  return `${getExplorerUrl(network)}/transaction/${txId}`;
}

export function getComponentUrl(address: string, network?: RadixNetwork): string {
  return `${getExplorerUrl(network)}/component/${address}`;
}

export function getResourceUrl(address: string, network?: RadixNetwork): string {
  return `${getExplorerUrl(network)}/resource/${address}`;
}
