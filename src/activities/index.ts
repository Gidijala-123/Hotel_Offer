import { env } from "../config/env";
import { logger } from "../config/logger";
import { createRedisClient } from "../config/redis";
import { queryHotelsFromRedis, saveHotelsToRedis } from "../services/redis-hotels";
import type { Hotel, SupplierHotel, SupplierId } from "../types/hotel";

async function fetchSupplier(
  supplier: SupplierId,
  city: string,
  simulateDown?: SupplierId
): Promise<SupplierHotel[]> {
  const supplierPath = supplier === "A" ? "supplierA" : "supplierB";
  const url = new URL(`/${supplierPath}/hotels`, `${env.supplierBaseUrl}/`);
  url.searchParams.set("city", city);
  if (simulateDown === supplier) {
    url.searchParams.set("fail", "true");
  }

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(env.supplierTimeoutMs)
    });
    if (!response.ok) {
      throw new Error(`${supplierPath} returned HTTP ${response.status}`);
    }
    const hotels: unknown = await response.json();
    if (!Array.isArray(hotels)) {
      throw new Error(`${supplierPath} returned an invalid hotel list`);
    }
    logger.info({ supplier, city, count: hotels.length }, "Fetched supplier hotels");
    return hotels as SupplierHotel[];
  } catch (error) {
    logger.error({ err: error, supplier, city }, "Supplier request failed");
    throw error;
  }
}

export async function fetchSupplierA(city: string, simulateDown?: SupplierId): Promise<SupplierHotel[]> {
  return fetchSupplier("A", city, simulateDown);
}

export async function fetchSupplierB(city: string, simulateDown?: SupplierId): Promise<SupplierHotel[]> {
  return fetchSupplier("B", city, simulateDown);
}

export async function saveToRedis(hotels: Hotel[], city: string): Promise<void> {
  const redis = createRedisClient();
  try {
    await redis.connect();
    await saveHotelsToRedis(redis, city, hotels);
    logger.info({ city, count: hotels.length }, "Saved deduplicated hotels to Redis");
  } catch (error) {
    logger.error({ err: error, city }, "Could not save hotels to Redis");
    throw error;
  } finally {
    redis.disconnect();
  }
}

export async function queryFromRedis(
  city: string,
  minPrice?: number,
  maxPrice?: number
): Promise<Hotel[]> {
  const redis = createRedisClient();
  try {
    await redis.connect();
    const hotels = await queryHotelsFromRedis(redis, city, minPrice, maxPrice);
    logger.info({ city, count: hotels.length, minPrice, maxPrice }, "Queried offers from Redis");
    return hotels;
  } catch (error) {
    logger.error({ err: error, city }, "Could not query hotels from Redis");
    throw error;
  } finally {
    redis.disconnect();
  }
}

export const activities = {
  fetchSupplierA,
  fetchSupplierB,
  saveToRedis,
  queryFromRedis
};
