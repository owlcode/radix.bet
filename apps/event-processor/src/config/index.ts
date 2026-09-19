import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3001'),

    // Database (used by @radix-bet/database package)
    RADIXBET_DATABASE_URL: z.string(),

    // Redis
    RADIXBET_VALKEY_URL: z.string().default('redis://localhost:6380'),

    // Radix Network
    RADIX_NETWORK: z.enum(['stokenet', 'mainnet']).default('stokenet'),
    RADIX_GATEWAY_URL: z.string().optional(),
    RADIX_PACKAGE_ADDRESS: z.string().optional(),
    SEEDER_PRIVATE_KEY: z.string().optional(),

    // Webhook
    HOOKAH_WEBHOOK_SECRET: z.string().optional(),

    // Hookah (webhook service)
    HOOKAH_BASE_URL: z.string().optional(),
    HOOKAH_PUBLIC_KEY: z.string().optional(),
    HOOKAH_PRIVATE_KEY: z.string().optional(),
    HOOKAH_WEBHOOK_URL: z.string().optional(),

    // Admin
    ADMIN_API_KEY: z.string().optional(),

    // Error reporting — read directly from process.env by src/instrument.ts
    // (which runs before this config loads). Unset = Sentry disabled.
    SENTRY_DSN: z.string().optional(),
    SENTRY_TRACES_SAMPLE_RATE: z.string().optional()
  })
  .refine((data) => data.RADIX_NETWORK === 'stokenet' || data.RADIX_GATEWAY_URL, {
    message: 'RADIX_GATEWAY_URL is required when RADIX_NETWORK=mainnet',
    path: ['RADIX_GATEWAY_URL']
  })
  .transform((data) => ({
    ...data,
    RADIX_GATEWAY_URL: data.RADIX_GATEWAY_URL ?? 'https://stokenet.radixdlt.com'
  }));

export type Env = z.infer<typeof envSchema>;

function loadConfig(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment configuration');
  }

  return result.data;
}

export const config = loadConfig();

// Re-export network helpers from shared config package
export { getNetworkConfig, networks as networkConfig } from '@radix-bet/config';
