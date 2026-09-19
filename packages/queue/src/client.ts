import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export function getRedisConnection(): Redis {
  if (globalForRedis.redis) {
    return globalForRedis.redis;
  }

  const redisUrl = process.env.RADIXBET_VALKEY_URL || process.env.REDIS_URL || 'redis://localhost:6380';

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });

  redis.on('error', (err) => {
    console.error('Redis connection error:', err);
  });

  redis.on('connect', () => {
    console.log('Redis connected');
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redis = redis;
  }

  return redis;
}

export async function closeRedisConnection(): Promise<void> {
  if (globalForRedis.redis) {
    await globalForRedis.redis.quit();
    globalForRedis.redis = undefined;
  }
}
