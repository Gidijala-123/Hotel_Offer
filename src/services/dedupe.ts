import type { Hotel, SupplierHotel, SupplierName } from "../types/hotel";

function normalizedName(name: string): string {
  return name.trim().toLowerCase();
}

function toHotel(hotel: SupplierHotel, supplier: SupplierName): Hotel {
  return {
    name: hotel.name,
    price: hotel.price,
    supplier,
    commissionPct: hotel.commissionPct
  };
}

function isPreferred(candidate: Hotel, current: Hotel): boolean {
  if (candidate.price !== current.price) {
    return candidate.price < current.price;
  }
  if (candidate.commissionPct !== current.commissionPct) {
    return candidate.commissionPct > current.commissionPct;
  }
  return candidate.supplier === "Supplier A" && current.supplier !== "Supplier A";
}

export function chooseBestOffers(
  supplierA: SupplierHotel[],
  supplierB: SupplierHotel[]
): Hotel[] {
  const bestByName = new Map<string, Hotel>();

  for (const [supplier, hotels] of [
    ["Supplier A", supplierA],
    ["Supplier B", supplierB]
  ] as const) {
    for (const supplierHotel of hotels) {
      const key = normalizedName(supplierHotel.name);
      if (!key) {
        continue;
      }
      const candidate = toHotel(supplierHotel, supplier);
      const current = bestByName.get(key);
      if (!current || isPreferred(candidate, current)) {
        bestByName.set(key, candidate);
      }
    }
  }

  return [...bestByName.values()].sort((left, right) => {
    const leftName = normalizedName(left.name);
    const rightName = normalizedName(right.name);
    return leftName < rightName ? -1 : leftName > rightName ? 1 : 0;
  });
}
