import { RadixNetwork } from '@radixdlt/babylon-gateway-api-sdk';
import { getXrdAddress } from '@radix-bet/config';

type NetworkConfig = {
  applicationName: string;
  networkId: typeof RadixNetwork.Stokenet | typeof RadixNetwork.Mainnet;
  resources: { xrd: string };
  dAppDefinitionAddress: string;
  publicBetV1: string;
  dustCleanerComponent: string;
  packageOwnerBadge: string;
};

function resolveNetwork(): typeof RadixNetwork.Stokenet | typeof RadixNetwork.Mainnet {
  if (typeof process !== 'undefined' && process.env.RADIX_NETWORK === 'mainnet') {
    return RadixNetwork.Mainnet;
  }
  return RadixNetwork.Stokenet;
}

function resolveConfig(): NetworkConfig & { challenge: { expiresInMs: number } } {
  const network = resolveNetwork();
  const isMainnet = network === RadixNetwork.Mainnet;
  const networkName = isMainnet ? 'mainnet' : 'stokenet';

  const DEFAULT_STOKENET_PACKAGE =
    'package_tdx_2_1pks3vry48d2qj7t92axct3jzmqxua8u28ldpwk2jnkjjezc7xxmcd0';
  const DEFAULT_STOKENET_DAPP_DEF =
    'account_tdx_2_129je3vl7alkf6n9v7n355gr332rk4sfqhpwms0sy6ce8fz4cjw0709';

  const envOr = (key: string, fallback: string) =>
    typeof process !== 'undefined' ? process.env[key] || fallback : fallback;

  return {
    applicationName: isMainnet ? 'radix.bet' : 'radix.bet - stokenet',
    networkId: network,
    resources: { xrd: getXrdAddress(networkName) },
    dAppDefinitionAddress: envOr(
      'DAPP_DEFINITION_ADDRESS',
      isMainnet ? 'NOT_CONFIGURED' : DEFAULT_STOKENET_DAPP_DEF
    ),
    publicBetV1: envOr(
      'RADIX_PACKAGE_ADDRESS',
      isMainnet ? 'NOT_CONFIGURED' : DEFAULT_STOKENET_PACKAGE
    ),
    dustCleanerComponent: isMainnet
      ? 'component_rdx1cpu3a9dck4k5lm2t5ey0kmxlqcemdzcqj0avdlpkkws0qnf0mmga0w'
      : 'component_tdx_2_1czfqkkc3nq0ss4zprukd2vf8dcxxdnpj9z6atywq8s3353wfvwa6t7',
    packageOwnerBadge: envOr('PACKAGE_OWNER_BADGE_ADDRESS', 'NOT_CONFIGURED'),
    challenge: { expiresInMs: 600_000 }
  };
}

export const config = resolveConfig();
export const networkId = config.networkId;
