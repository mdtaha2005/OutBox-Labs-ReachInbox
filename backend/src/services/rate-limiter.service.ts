import { redisClient } from "../config/redis.js";
import { RateLimitResult } from "../types/index.js";

export class RateLimiterService {
  private static WINDOW_MS = 60 * 60 * 1000; // 1 hour window

  /**
   * Evaluates if a sender can send an email under the sliding-window hourly rate limit.
   * Atomic evaluation using Redis Multi / Lua equivalent logic.
   */
  static async checkAndRecordSend(
    senderId: string,
    hourlyLimit: number
  ): Promise<RateLimitResult> {
    const key = `rate_limit:sender:${senderId}`;
    const now = Date.now();
    const windowStart = now - this.WINDOW_MS;

    // Remove expired entries older than 1 hour
    await redisClient.zremrangebyscore(key, 0, windowStart);

    // Count sends in the active window
    const currentCount = await redisClient.zcard(key);

    if (currentCount < hourlyLimit) {
      // Add current send with unique member and timestamp as score
      const member = `${now}:${Math.random().toString(36).substring(2, 8)}`;
      await redisClient.zadd(key, now, member);
      await redisClient.pexpire(key, this.WINDOW_MS);

      return {
        allowed: true,
        remaining: hourlyLimit - currentCount - 1,
        waitMs: 0,
      };
    } else {
      // Rate limit exceeded: get the oldest send in the active window
      const oldestEntries = await redisClient.zrange(key, 0, 0, "WITHSCORES");
      let waitMs = 5000; // default fallback wait
      if (oldestEntries.length >= 2) {
        const oldestScore = parseInt(oldestEntries[1], 10);
        waitMs = Math.max(oldestScore + this.WINDOW_MS - now + 500, 1000);
      }

      return {
        allowed: false,
        remaining: 0,
        waitMs,
      };
    }
  }

  /**
   * Enforces minimum delay between consecutive sends for a given sender.
   * If last send was less than delaySeconds ago, sleeps for the remainder.
   */
  static async enforceSenderDelay(
    senderId: string,
    delaySeconds: number
  ): Promise<void> {
    const key = `delay:sender:${senderId}:last_sent`;
    const now = Date.now();
    const minDelayMs = Math.max(delaySeconds, 1) * 1000;

    const lastSentStr = await redisClient.get(key);
    if (lastSentStr) {
      const lastSent = parseInt(lastSentStr, 10);
      const elapsed = now - lastSent;
      if (elapsed < minDelayMs) {
        const sleepMs = minDelayMs - elapsed;
        await new Promise((resolve) => setTimeout(resolve, sleepMs));
      }
    }

    // Update last sent timestamp
    await redisClient.set(key, Date.now().toString(), "PX", minDelayMs * 2);
  }
}
