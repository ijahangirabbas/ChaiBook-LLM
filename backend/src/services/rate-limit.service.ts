import { redisConnection } from '../queue/ingestion.queue';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

async function incrementWithWindow(key: string, windowSeconds: number): Promise<number> {
  const count = await redisConnection.incr(key);
  if (count === 1) {
    await redisConnection.expire(key, windowSeconds);
  }
  return count;
}

async function getTtlMs(key: string): Promise<number> {
  const ttl = await redisConnection.ttl(key);
  if (ttl <= 0) return 0;
  return ttl * 1000;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    if (redisConnection.status === 'wait' || redisConnection.status === 'close') {
      await redisConnection.connect();
    }
    const count = await incrementWithWindow(`ratelimit:${key}`, windowSeconds);
    const ttlMs = await getTtlMs(`ratelimit:${key}`);
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt: Date.now() + ttlMs,
      limit,
    };
  } catch {
    // Fail open when Redis unavailable in development
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowSeconds * 1000, limit };
  }
}

export async function checkChatRateLimit(workspaceId: string): Promise<RateLimitResult> {
  return checkRateLimit(`chat:${workspaceId}`, 20, 60);
}

export async function checkUploadRateLimit(workspaceId: string): Promise<RateLimitResult> {
  return checkRateLimit(`upload:${workspaceId}`, 10, 3600);
}
