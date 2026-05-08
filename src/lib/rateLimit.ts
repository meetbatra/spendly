import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const globalForRateLimit = globalThis as unknown as {
  upstashRedis?: Redis;
};

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  if (!globalForRateLimit.upstashRedis) {
    globalForRateLimit.upstashRedis = new Redis({
      url,
      token,
    });
  }

  return globalForRateLimit.upstashRedis;
}

export function createSlidingWindowRateLimit(limit: number, window: `${number} h` | `${number} m`, prefix: string): Ratelimit | null {
  const redis = getRedisClient();

  if (!redis) {
    return null;
  }

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: true,
    prefix,
  });
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}
