export type SupplierName = "Supplier A" | "Supplier B";
export type SupplierId = "A" | "B";

export interface Hotel {
  name: string;
  price: number;
  supplier: SupplierName;
  commissionPct: number;
}

export interface SupplierHotel {
  hotelId: string;
  name: string;
  price: number;
  city: string;
  commissionPct: number;
}

export interface HotelOffersWorkflowInput {
  city: string;
  minPrice?: number;
  maxPrice?: number;
  simulateDown?: SupplierId;
}
