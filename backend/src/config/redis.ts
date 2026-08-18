import Redis, { RedisOptions } from "ioredis";
import { env } from "./env.js";

export const redisConnectionOptions: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
};

export const redisClient = new Redis(redisConnectionOptions);

redisClient.on("connect", () => {
  console.log(`[Redis] Connected successfully to ${env.REDIS_HOST}:${env.REDIS_PORT}`);
});

redisClient.on("error", (err) => {
  console.error("[Redis] Connection error:", err.message);
});
