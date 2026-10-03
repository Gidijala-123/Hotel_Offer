import type Redis from "ioredis";
import type { Hotel } from "../types/hotel";
import { env } from "../config/env";

function cityKey(city: string): string {
  return city.trim().toLowerCase();
}

function normalizedName(name: string): string {
  return name.trim().toLowerCase();
}

function indexKey(city: string): string {
  return `hotels:${cityKey(city)}:prices`;
}

function detailsKey(city: string, name: string): string {
  return `hotels:${cityKey(city)}:hotel:${encodeURIComponent(normalizedName(name))}`;
}

export async function saveHotelsToRedis(
  redis: Redis,
  city: string,
  hotels: Hotel[]
): Promise<void> {
  const index = indexKey(city);
  const transaction = redis.multi();
  transaction.del(index);
  for (const hotel of hotels) {
    const key = detailsKey(city, hotel.name);
    transaction.set(key, JSON.stringify(hotel), "EX", env.redisTtlSeconds);
    transaction.zadd(index, hotel.price, normalizedName(hotel.name));
    transaction.expire(index, env.redisTtlSeconds);
  }
  if (hotels.length === 0) {
    transaction.expire(index, env.redisTtlSeconds);
  }

  const result = await transaction.exec();
  if (!result || result.some(([error]) => error !== null)) {
    throw new Error(`Redis transaction failed while saving offers for city "${city}"`);
  }
}

export async function queryHotelsFromRedis(
  redis: Redis,
  city: string,
  minPrice?: number,
  maxPrice?: number
): Promise<Hotel[]> {
  const minimum = minPrice ?? "-inf";
  const maximum = maxPrice ?? "+inf";
  const names = await redis.zrangebyscore(indexKey(city), minimum, maximum);
  if (names.length === 0) {
    return [];
  }

  const values = await redis.mget(...names.map((name) => detailsKey(city, name)));
  return values.flatMap((value) => {
    if (value === null) {
      throw new Error(`Redis hotel details are missing for a price index entry in "${city}"`);
    }
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("name" in parsed) ||
      !("price" in parsed) ||
      !("supplier" in parsed) ||
      !("commissionPct" in parsed)
    ) {
      throw new Error(`Invalid hotel details found in Redis for city "${city}"`);
    }
    return [{
      name: String(parsed.name),
      price: Number(parsed.price),
      supplier: parsed.supplier as Hotel["supplier"],
      commissionPct: Number(parsed.commissionPct)
    }];
  });
}
