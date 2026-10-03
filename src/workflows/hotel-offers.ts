import { ApplicationFailure, log, proxyActivities } from "@temporalio/workflow";
import type { activities } from "../activities";
import { chooseBestOffers } from "../services/dedupe";
import type { Hotel, HotelOffersWorkflowInput, SupplierHotel } from "../types/hotel";

const supplierActivities = proxyActivities<Pick<
  typeof activities,
  "fetchSupplierA" | "fetchSupplierB"
>>({
  startToCloseTimeout: "10 seconds",
  retry: {
    initialInterval: "1 second",
    backoffCoefficient: 2,
    maximumAttempts: 3
  }
});

const redisActivities = proxyActivities<Pick<
  typeof activities,
  "saveToRedis" | "queryFromRedis"
>>({
  startToCloseTimeout: "10 seconds",
  retry: {
    initialInterval: "1 second",
    backoffCoefficient: 2,
    maximumAttempts: 3
  }
});

export async function hotelOffersWorkflow(input: HotelOffersWorkflowInput): Promise<Hotel[]> {
  const results = await Promise.allSettled([
    supplierActivities.fetchSupplierA(input.city, input.simulateDown),
    supplierActivities.fetchSupplierB(input.city, input.simulateDown)
  ]);

  const supplierA = results[0];
  const supplierB = results[1];
  if (supplierA.status === "rejected") {
    log.error("Supplier A failed after activity retries", { city: input.city, error: String(supplierA.reason) });
  }
  if (supplierB.status === "rejected") {
    log.error("Supplier B failed after activity retries", { city: input.city, error: String(supplierB.reason) });
  }
  if (supplierA.status === "rejected" && supplierB.status === "rejected") {
    throw ApplicationFailure.nonRetryable("Both hotel suppliers are unavailable", "SuppliersUnavailable");
  }

  const hotelsA: SupplierHotel[] = supplierA.status === "fulfilled" ? supplierA.value : [];
  const hotelsB: SupplierHotel[] = supplierB.status === "fulfilled" ? supplierB.value : [];
  const deduplicated = chooseBestOffers(hotelsA, hotelsB);
  await redisActivities.saveToRedis(deduplicated, input.city);
  return redisActivities.queryFromRedis(input.city, input.minPrice, input.maxPrice);
}
