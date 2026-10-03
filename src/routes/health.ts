import { Router } from "express";
import { Connection } from "@temporalio/client";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { createRedisClient } from "../config/redis";

export const healthRouter = Router();

type ComponentStatus = "up" | "down";

async function checkSupplier(path: string): Promise<ComponentStatus> {
  try {
    const url = new URL(path, `${env.supplierBaseUrl}/`);
    url.searchParams.set("city", "delhi");
    const response = await fetch(url, { signal: AbortSignal.timeout(env.supplierTimeoutMs) });
    return response.ok ? "up" : "down";
  } catch {
    return "down";
  }
}

async function checkRedis(): Promise<ComponentStatus> {
  const redis = createRedisClient();
  try {
    await redis.connect();
    return (await redis.ping()) === "PONG" ? "up" : "down";
  } catch {
    return "down";
  } finally {
    redis.disconnect();
  }
}

async function checkTemporal(): Promise<ComponentStatus> {
  let connection: Connection | undefined;
  try {
    connection = await Connection.connect({
      address: env.temporalAddress,
      connectTimeout: 2500
    });
    await connection.workflowService.getSystemInfo({});
    return "up";
  } catch {
    return "down";
  } finally {
    if (connection) {
      await connection.close().catch((error: unknown) => {
        logger.warn({ err: error }, "Failed to close Temporal health-check connection");
      });
    }
  }
}

healthRouter.get("/health", async (_req, res, next) => {
  try {
    const [supplierA, supplierB, redis, temporal] = await Promise.all([
      checkSupplier("/supplierA/hotels"),
      checkSupplier("/supplierB/hotels"),
      checkRedis(),
      checkTemporal()
    ]);
    const coreUnavailable = redis === "down" || temporal === "down";
    const bothSuppliersUnavailable = supplierA === "down" && supplierB === "down";
    const status = coreUnavailable || bothSuppliersUnavailable
      ? "down"
      : supplierA === "down" || supplierB === "down"
        ? "degraded"
        : "ok";

    res.status(status === "down" ? 503 : 200).json({
      status,
      suppliers: { supplierA, supplierB },
      redis,
      temporal
    });
  } catch (error) {
    next(error);
  }
});
