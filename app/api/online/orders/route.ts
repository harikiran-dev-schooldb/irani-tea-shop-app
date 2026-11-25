import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { menuItems, onlineOrders } from "@/db/schema";
import { onlineEnabled, deliveryEnabled, deliveryFee, deliveryMinimum, orderInput } from "@/lib/online-ordering";
export const dynamic = "force-dynamic";
const reply = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request: Request) {
  const token = z.string().uuid().safeParse(request.headers.get("x-order-token"));
  if (!token.success) return reply({ error: "Invalid tracking code." }, 400);
  try {
    const [row] = await getDb().select({ id: onlineOrders.id, status: onlineOrders.status, total: onlineOrders.total, fulfillment: onlineOrders.fulfillment, updatedAt: onlineOrders.updatedAt }).from(onlineOrders).where(eq(onlineOrders.id, token.data));
    return row ? reply(row) : reply({ error: "Order not found." }, 404);
  } catch { return reply({ error: "Tracking unavailable." }, 503); }
}
export async function POST(request: Request) {
  if (!onlineEnabled()) return reply({ error: "Online ordering is currently closed." }, 503);
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "Invalid origin." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "JSON required." }, 415);
  try {
    const raw = await request.text();
    if (raw.length > 10000) return reply({ error: "Request too large." }, 413);
    const parsed = orderInput.safeParse(JSON.parse(raw));
    if (!parsed.success) return reply({ error: "Check your name, phone and order quantities." }, 400);
    const p = parsed.data, db = getDb();
    const [existing] = await db.select({ id: onlineOrders.id, status: onlineOrders.status, total: onlineOrders.total }).from(onlineOrders).where(eq(onlineOrders.id,p.id));
    if (existing) return reply(existing);
    if (p.fulfillment === "delivery" && (!deliveryEnabled() || p.address.length < 10)) return reply({ error: "Delivery is unavailable or address is incomplete." }, 400);
    const ids = p.items.map(i => i.id);
    if (new Set(ids).size !== ids.length) return reply({ error: "Duplicate item." }, 400);
    const menu = await db.select().from(menuItems).where(and(inArray(menuItems.id, ids), eq(menuItems.isAvailable,true)));
    const lines = p.items.map(i => {
      const m = menu.find(x => x.id === i.id);
      return m && m.stockQty >= i.quantity && m.price > 0 ? { id: m.id, name: m.name, quantity: i.quantity, unitPrice: m.price } : null;
    });
    if (lines.some(i => i === null)) return reply({ error: "An item is no longer available. Refresh the menu." }, 409);
    const verified = lines.filter(i => i !== null);
    const subtotal = verified.reduce((n,i)=>n+i.quantity*i.unitPrice,0);
    const fee = p.fulfillment === "delivery" ? deliveryFee() : 0;
    if (p.fulfillment === "delivery" && subtotal < deliveryMinimum()) return reply({ error: "Delivery minimum not met." }, 400);
    if (subtotal + fee !== p.total || p.total > 10000) return reply({ error: "Price changed. Refresh the menu." }, 409);
    const [created] = await db.insert(onlineOrders).values({ id:p.id, customer:p.customer, phone:p.phone, address:p.fulfillment==="delivery"?p.address:"", fulfillment:p.fulfillment, lines:verified, subtotal, deliveryFee:fee, total:p.total }).onConflictDoNothing().returning({ id:onlineOrders.id,status:onlineOrders.status,total:onlineOrders.total });
    if (created) return reply(created,201);
    const [retry] = await db.select({id:onlineOrders.id,status:onlineOrders.status,total:onlineOrders.total}).from(onlineOrders).where(eq(onlineOrders.id,p.id));
    return retry ? reply(retry) : reply({error:"An active order already exists for this phone number. Contact the shop."},409);
  } catch { return reply({ error: "Could not submit the order. Retry using the same checkout." }, 503); }
}
