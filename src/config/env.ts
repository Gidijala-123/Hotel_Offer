import dotenv from "dotenv";

dotenv.config();

function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received "${value}"`);
  }
  return parsed;
}

export const env = {
  port: positiveInteger(process.env.PORT, 3000),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  temporalAddress: process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
  temporalNamespace: process.env.TEMPORAL_NAMESPACE ?? "default",
  taskQueue: process.env.TASK_QUEUE ?? "hotel-offers",
  supplierBaseUrl: (process.env.SUPPLIER_BASE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  supplierTimeoutMs: positiveInteger(process.env.SUPPLIER_TIMEOUT_MS, 5000),
  simulateDown: process.env.SIMULATE_DOWN?.toUpperCase(),
  redisTtlSeconds: positiveInteger(process.env.REDIS_TTL_SECONDS, 3600),
  logLevel: process.env.LOG_LEVEL ?? "info"
};

if (env.simulateDown && env.simulateDown !== "A" && env.simulateDown !== "B") {
  throw new Error("SIMULATE_DOWN must be A, B, or unset");
}
