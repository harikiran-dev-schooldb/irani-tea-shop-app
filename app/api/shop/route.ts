import { desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { menuItems, orders, transactions } from "@/db/schema";
import { starterMenu } from "@/lib/shop-data";

export const dynamic = "force-dynamic";

function positiveNumber(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${field} must be greater than zero.`);
  return Math.round(parsed);
}

function cleanText(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

async function readShop() {
  const db = getDb();
  let menu = await db.select().from(menuItems).orderBy(menuItems.category, menuItems.name);
  if (menu.length === 0) {
    await db.insert(menuItems).values(starterMenu.map((item) => ({ ...item, isAvailable: true }))).onConflictDoNothing();
    menu = await db.select().from(menuItems).orderBy(menuItems.category, menuItems.name);
  }
  const [orderRows, transactionRows] = await Promise.all([
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(250),
    db.select().from(transactions).orderBy(desc(transactions.createdAt)).limit(500),
  ]);
  return {
    menu,
    orders: orderRows.map((order) => ({ ...order, createdAt: order.createdAt.toISOString() })),
    transactions: transactionRows.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() })),
  };
}

export async function GET() {
  try {
    return NextResponse.json(await readShop());
  } catch (error) {
    console.error("Could not load shop data", error);
    return NextResponse.json({ error: "The shop database is unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const kind = cleanText(payload.kind);
    const db = getDb();

    if (kind === "menu") {
      const name = cleanText(payload.name);
      const category = cleanText(payload.category);
      if (!name || !category) throw new Error("Item name and category are required.");
      await db.insert(menuItems).values({ name, category, price: positiveNumber(payload.price, "Price") });
    } else if (kind === "menu-toggle") {
      const id = cleanText(payload.id);
      if (!id) throw new Error("Menu item is required.");
      await db.update(menuItems).set({ isAvailable: Boolean(payload.isAvailable) }).where(eq(menuItems.id, id));
    } else if (kind === "sale" || kind === "expense" || kind === "transaction") {
      const type = payload.type === "expense" || kind === "expense" ? "expense" : "sale";
      await db.insert(transactions).values({
        type,
        category: cleanText(payload.category, type === "sale" ? "Counter sale" : "Other"),
        amount: positiveNumber(payload.amount, "Amount"),
        note: cleanText(payload.note),
      });
    } else if (kind === "order") {
      const total = positiveNumber(payload.total, "Total");
      const itemCount = positiveNumber(payload.itemCount, "Item count");
      const customer = cleanText(payload.customer, "Walk-in") || "Walk-in";
      await db.execute(sql`
        WITH new_order AS (
          INSERT INTO ${orders} (order_no, customer, item_count, total)
          VALUES (nextval('order_number_seq'), ${customer}, ${itemCount}, ${total})
          RETURNING id, order_no, total
        )
        INSERT INTO ${transactions} (type, category, amount, note, order_id)
        SELECT 'sale', 'Orders', total, 'Order #' || order_no, id FROM new_order
      `);
    } else if (kind === "order-status") {
      const status = cleanText(payload.status);
      if (!(["preparing", "ready", "completed"] as string[]).includes(status)) throw new Error("Invalid order status.");
      await db.update(orders).set({ status: status as "preparing" | "ready" | "completed" }).where(eq(orders.id, cleanText(payload.id)));
    } else {
      throw new Error("Unknown shop action.");
    }

    return NextResponse.json(await readShop());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save this entry.";
    console.error("Could not update shop data", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
