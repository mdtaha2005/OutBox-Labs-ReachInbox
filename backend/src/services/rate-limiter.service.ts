import { redisClient } from "../config/redis.js";
import { RateLimitResult } from "../types/index.js";

export class RateLimiterService {
  private static WINDOW_MS = 60 * 60 * 1000; // 1 hour window

  private static RATE_LIMIT_LUA = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local window_ms = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    local member = ARGV[4]
    local window_start = now - window_ms

    -- 1. Remove expired entries older than 1 hour window
    redis.call('ZREMRANGEBYSCORE', key, 0, window_start)

    -- 2. Count current active sends in window
    local current_count = redis.call('ZCARD', key)

    if current_count < limit then
      -- Under limit: add send and set expiry
      redis.call('ZADD', key, now, member)
      redis.call('PEXPIRE', key, window_ms)
      return {1, limit - current_count - 1, 0}
    else
      -- Over limit: calculate wait time until oldest send expires
      local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
      local wait_ms = 5000
      if #oldest >= 2 then
        local oldest_score = tonumber(oldest[2])
        wait_ms = math.max(oldest_score + window_ms - now + 500, 1000)
      end
      return {0, 0, wait_ms}
    end
  `;

  private static DELAY_SLOT_LUA = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local delay_ms = tonumber(ARGV[2])

    local last_slot = tonumber(redis.call('GET', key) or '0')
    local target_slot = math.max(now, last_slot) + delay_ms
    local ttl_ms = math.max((target_slot - now) * 2, delay_ms * 10)
    
    redis.call('SET', key, target_slot, 'PX', ttl_ms)
    return target_slot
  `;

  /**
   * Evaluates if a sender can send an email under the sliding-window hourly rate limit.
   * Completely atomic execution via Redis Lua script (safe across concurrent workers).
   */
  static async checkAndRecordSend(
    senderId: string,
    hourlyLimit: number
  ): Promise<RateLimitResult> {
    const key = `rate_limit:sender:${senderId}`;
    const now = Date.now();
    const member = `${now}:${Math.random().toString(36).substring(2, 8)}`;

    const result = (await redisClient.eval(
      this.RATE_LIMIT_LUA,
      1,
      key,
      now.toString(),
      this.WINDOW_MS.toString(),
      hourlyLimit.toString(),
      member
    )) as [number, number, number];

    const [allowedNum, remaining, waitMs] = result;
    return {
      allowed: allowedNum === 1,
      remaining,
      waitMs,
    };
  }

  /**
   * Enforces minimum delay between consecutive sends for a given sender.
   * Uses atomic Redis slot reservation to prevent race conditions across parallel workers.
   */
  static async enforceSenderDelay(
    senderId: string,
    delaySeconds: number
  ): Promise<void> {
    const key = `delay:sender:${senderId}:slot`;
    const now = Date.now();
    const minDelayMs = Math.max(delaySeconds, 1) * 1000;

    const targetSlot = (await redisClient.eval(
      this.DELAY_SLOT_LUA,
      1,
      key,
      now.toString(),
      minDelayMs.toString()
    )) as number;

    const sendTime = targetSlot - minDelayMs;
    const waitMs = sendTime - now;

    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

