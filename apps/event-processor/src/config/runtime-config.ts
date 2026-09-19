import { prisma } from '@radix-bet/database';

const cache = new Map<string, { value: string | null; expiresAt: number }>();
const TTL_MS = 60_000; // 60s cache

export async function getConfig(key: string): Promise<string | null> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const entry = await prisma.config.findUnique({ where: { key } });
  const value = entry?.value ?? null;
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
  return value;
}

export function clearConfigCache(): void {
  cache.clear();
}
