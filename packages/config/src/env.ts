export type RadixNetwork = 'stokenet' | 'mainnet';

export function getNetwork(): RadixNetwork {
  const network = process.env.RADIX_NETWORK;
  if (network !== 'stokenet' && network !== 'mainnet') {
    console.warn(`Invalid RADIX_NETWORK: ${network}, defaulting to stokenet`);
    return 'stokenet';
  }
  return network;
}

export function isStokenet(): boolean {
  return getNetwork() === 'stokenet';
}

export function isMainnet(): boolean {
  return getNetwork() === 'mainnet';
}

export const env = {
  get network() {
    return getNetwork();
  },
  get isStokenet() {
    return isStokenet();
  },
  get isMainnet() {
    return isMainnet();
  },
  get databaseUrl() {
    return process.env.DATABASE_URL || '';
  },
  get redisUrl() {
    return process.env.RADIXBET_VALKEY_URL || process.env.REDIS_URL || 'redis://localhost:6380';
  },
  get webhookSecret() {
    return process.env.HOOKAH_WEBHOOK_SECRET;
  }
};
