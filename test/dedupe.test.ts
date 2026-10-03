import { describe, expect, it } from "@jest/globals";
import { chooseBestOffers } from "../src/services/dedupe";
import type { SupplierHotel } from "../src/types/hotel";

function supplierHotel(
  hotelId: string,
  name: string,
  price: number,
  commissionPct: number
): SupplierHotel {
  return { hotelId, name, price, city: "delhi", commissionPct };
}

describe("chooseBestOffers", () => {
  it("chooses the cheaper offer for overlapping names", () => {
    const result = chooseBestOffers(
      [supplierHotel("a1", "Holtin", 6000, 10)],
      [supplierHotel("b1", "Holtin", 5340, 20)]
    );

    expect(result).toEqual([
      { name: "Holtin", price: 5340, supplier: "Supplier B", commissionPct: 20 }
    ]);
  });

  it("breaks a price tie by higher commission, then Supplier A", () => {
    const commissionWinner = chooseBestOffers(
      [supplierHotel("a1", "Hotel", 5000, 10)],
      [supplierHotel("b1", "hotel", 5000, 15)]
    );
    expect(commissionWinner[0]?.supplier).toBe("Supplier B");

    const supplierWinner = chooseBestOffers(
      [supplierHotel("a1", "Hotel", 5000, 15)],
      [supplierHotel("b1", "hotel", 5000, 15)]
    );
    expect(supplierWinner[0]?.supplier).toBe("Supplier A");
  });

  it("keeps hotels offered by only one supplier", () => {
    expect(chooseBestOffers(
      [supplierHotel("a1", "Only A", 4200, 8)],
      [supplierHotel("b1", "Only B", 5100, 12)]
    )).toHaveLength(2);
  });

  it("matches trimmed names case-insensitively and preserves the selected original name", () => {
    const result = chooseBestOffers(
      [supplierHotel("a1", "  HoltIn ", 6000, 10)],
      [supplierHotel("b1", " holtin ", 5500, 12)]
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: " holtin ",
      price: 5500,
      supplier: "Supplier B",
      commissionPct: 12
    });
  });

  it("returns an empty list when both suppliers return no hotels", () => {
    expect(chooseBestOffers([], [])).toEqual([]);
  });
});
