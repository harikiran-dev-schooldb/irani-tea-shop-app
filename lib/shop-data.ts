export type MenuItem = { id: string; name: string; category: string; price: number; isAvailable: boolean };
export type Order = { id: string; orderNo: number; customer: string; itemCount: number; total: number; status: string; createdAt: string };
export type PaymentMode = "cash" | "online";
export type Transaction = { id: string; type: "sale" | "expense"; category: string; amount: number; note: string; paymentMode: PaymentMode; createdAt: string };
export type ShopData = { menu: MenuItem[]; orders: Order[]; transactions: Transaction[] };

export const starterMenu = [
  { name: "Irani Tea", category: "Tea", price: 15 },
  { name: "Lemon Tea", category: "Tea", price: 20 },
  { name: "Special Irani Tea", category: "Tea", price: 20 },
  { name: "Horlicks", category: "Health Drinks", price: 20 },
  { name: "Boost", category: "Health Drinks", price: 20 },
  { name: "Osmania Biscuit (1 Pc)", category: "Biscuits", price: 5 },
  { name: "Osmania Biscuit (2 Pcs)", category: "Biscuits", price: 10 },
  { name: "Water Bottle 500 ml", category: "Water", price: 10 },
  { name: "Water Bottle 1 Litre", category: "Water", price: 20 },
] as const;
