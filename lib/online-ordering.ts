import { z } from "zod";

export const orderInput = z.object({
  id: z.string().uuid(),
  customer: z.string().trim().min(2).max(80),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  fulfillment: z.enum(["pickup", "delivery"]),
  address: z.string().trim().max(300).default(""),
  items: z.array(z.object({ id: z.string().uuid(), quantity: z.number().int().min(1).max(20) })).min(1).max(20),
  total: z.number().int().positive().max(10000),
});
export const onlineEnabled = () => process.env.ONLINE_ORDERING_ENABLED === "true";
export const deliveryEnabled = () => process.env.ONLINE_DELIVERY_ENABLED === "true";
function setting(raw: string | undefined, fallback: number) {
  const n = Number(raw ?? fallback);
  return Number.isSafeInteger(n) && n >= 0 && n <= 10000 ? n : fallback;
}
export const deliveryFee = () => setting(process.env.ONLINE_DELIVERY_FEE, 20);
export const deliveryMinimum = () => setting(process.env.ONLINE_DELIVERY_MINIMUM, 99);
export const transitions: Record<string, string[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["cancelled"],
};
