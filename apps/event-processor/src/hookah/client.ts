import { createHookahSdk, createEd25519Keypair, createEd25519PublicKey } from 'hookah-sdk';
import { config } from '../config/index.js';

let sdkInstance: ReturnType<typeof createHookahSdk> | null = null;

export function getHookahSdk(): ReturnType<typeof createHookahSdk> {
  if (sdkInstance) return sdkInstance;

  const { HOOKAH_BASE_URL, HOOKAH_PUBLIC_KEY, HOOKAH_PRIVATE_KEY } = config;

  if (!HOOKAH_BASE_URL || !HOOKAH_PUBLIC_KEY || !HOOKAH_PRIVATE_KEY) {
    throw new Error(
      'Hookah SDK not configured: HOOKAH_BASE_URL, HOOKAH_PUBLIC_KEY, HOOKAH_PRIVATE_KEY required'
    );
  }

  const keypair = createEd25519Keypair(HOOKAH_PRIVATE_KEY);
  const publicKey = createEd25519PublicKey(HOOKAH_PUBLIC_KEY);

  sdkInstance = createHookahSdk({
    publicKey,
    personaLabel: 'radixbet-event-processor',
    signer: async (hash: Uint8Array) => {
      const sig = keypair.sign(hash);
      return Buffer.from(sig).toString('hex');
    },
    baseUrl: HOOKAH_BASE_URL,
  });

  return sdkInstance;
}

export function isHookahConfigured(): boolean {
  return !!(config.HOOKAH_BASE_URL && config.HOOKAH_PUBLIC_KEY && config.HOOKAH_PRIVATE_KEY);
}
