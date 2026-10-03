import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

export function createRedisClient(): Redis {
  const redis = new Redis(env.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    retryStrategy: (attempt) => Math.min(attempt * 200, 2000)
  });
  redis.on("error", (error: Error) => {
    logger.error({ err: error }, "Redis connection error");
  });
  return redis;
}
