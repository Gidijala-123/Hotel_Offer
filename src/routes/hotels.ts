import { Router } from "express";
import { Client, Connection } from "@temporalio/client";
import { env } from "../config/env";
import { logger } from "../config/logger";
import type { HotelOffersWorkflowInput, SupplierId } from "../types/hotel";
import { hotelOffersWorkflow } from "../workflows";

export const hotelsRouter = Router();

function parsePrice(value: unknown, field: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a valid number`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} must be a valid number`);
  }
  return parsed;
}

hotelsRouter.get("/hotels", async (req, res, next) => {
  const city = typeof req.query.city === "string" ? req.query.city.trim() : "";
  if (!city) {
    res.status(400).json({ error: "The city query parameter is required" });
    return;
  }

  let minPrice: number | undefined;
  let maxPrice: number | undefined;
  let simulateDown: SupplierId | undefined;
  try {
    minPrice = parsePrice(req.query.minPrice, "minPrice");
    maxPrice = parsePrice(req.query.maxPrice, "maxPrice");
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      res.status(400).json({ error: "minPrice must be less than or equal to maxPrice" });
      return;
    }
    if (req.query.simulateDown !== undefined) {
      if (req.query.simulateDown !== "A" && req.query.simulateDown !== "B") {
        res.status(400).json({ error: "simulateDown must be A or B" });
        return;
      }
      simulateDown = req.query.simulateDown;
    }
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid price filter" });
    return;
  }

  let connection: Connection | undefined;
  try {
    connection = await Connection.connect({ address: env.temporalAddress });
    const client = new Client({
      connection,
      namespace: env.temporalNamespace
    });
    const input: HotelOffersWorkflowInput = { city, minPrice, maxPrice, simulateDown };
    const handle = await client.workflow.start(hotelOffersWorkflow, {
      taskQueue: env.taskQueue,
      workflowId: `hotel-offers-${city.toLocaleLowerCase("en")}-${crypto.randomUUID()}`,
      args: [input]
    });
    const hotels = await handle.result();
    res.json(hotels);
  } catch (error) {
    next(error);
  } finally {
    try {
      await connection?.close();
    } catch (error) {
      logger.warn({ err: error }, "Failed to close Temporal connection");
    }
  }
});
