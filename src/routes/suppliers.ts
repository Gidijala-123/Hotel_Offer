import { Router, type Request, type Response } from "express";
import { env } from "../config/env";
import { supplierAHotels, supplierBHotels } from "../mock/data";
import type { SupplierHotel } from "../types/hotel";

export const supplierRouter = Router();

function sendSupplierHotels(
  req: Request,
  res: Response,
  supplier: "A" | "B",
  records: SupplierHotel[]
): void {
  const simulatedDown = env.simulateDown === supplier;
  const forcedFailure = req.query.fail === "true";
  if (simulatedDown || forcedFailure) {
    res.status(503).json({ error: `Supplier ${supplier} is temporarily unavailable` });
    return;
  }

  const city = typeof req.query.city === "string"
    ? req.query.city.trim().toLowerCase()
    : undefined;
  res.json(city ? records.filter((hotel) => hotel.city === city) : records);
}

supplierRouter.get("/supplierA/hotels", (req, res) =>
  sendSupplierHotels(req, res, "A", supplierAHotels)
);
supplierRouter.get("/supplierB/hotels", (req, res) =>
  sendSupplierHotels(req, res, "B", supplierBHotels)
);
