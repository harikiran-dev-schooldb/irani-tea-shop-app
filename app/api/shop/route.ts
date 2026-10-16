import { desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import {
  dailyClosings,
  menuItems,
  orderItems,
  orders,
  transactions,
} from "@/db/schema";
import { starterMenu } from "@/lib/shop-data";
import { authorizeShopRequest } from "@/lib/shop-auth";

export const dynamic = "force-dynamic";

function positiveNumber(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${field} must be greater than zero.`);
  return Math.round(parsed);
}

function nonNegativeNumber(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0)
    throw new Error(`${field} cannot be negative.`);
  return Math.round(parsed);
}

function cleanText(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

function paymentMode(value: unknown) {
  return value === "online" ? "online" : "cash";
}

function currentIndiaTime() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

function transactionDate(value: unknown, timeValue?: unknown) {
  const date = cleanText(value);
  if (!date) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Choose a valid date.");
  const time = cleanText(timeValue, currentIndiaTime());
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Choose a valid time.");
  const parsed = new Date(`${date}T${time}:00+05:30`);
  if (Number.isNaN(parsed.getTime())) throw new Error("Choose a valid date.");
  return parsed;
}

async function readShop() {
  const db = getDb();
  let menu = await db.select().from(menuItems).orderBy(menuItems.category, menuItems.name);
  if (menu.length === 0) {
    await db.insert(menuItems).values(starterMenu.map((item) => ({ ...item, isAvailable: true }))).onConflictDoNothing();
    menu = await db.select().from(menuItems).orderBy(menuItems.category, menuItems.name);
  }
  const [orderRows, orderItemRows, transactionRows, closingRows] = await Promise.all([
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(250),
    db.select().from(orderItems).limit(1000),
    db.select().from(transactions).orderBy(desc(transactions.createdAt)).limit(500),
    db.select().from(dailyClosings).orderBy(desc(dailyClosings.businessDate)).limit(365),
  ]);
  return {
    menu,
    orders: orderRows.map((order) => ({ ...order, createdAt: order.createdAt.toISOString() })),
    orderItems: orderItemRows,
    transactions: transactionRows.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() })),
    closings: closingRows.map((closing) => ({
      ...closing,
      closedAt: closing.closedAt.toISOString(),
    })),
  };
}

export async function GET(request: Request) {
  const authorization = await authorizeShopRequest(request);
  if (authorization instanceof NextResponse) return authorization;
  try {
    return NextResponse.json(await readShop());
  } catch (error) {
    console.error("Could not load shop data", error);
    return NextResponse.json({ error: "The shop database is unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeShopRequest(request);
  if (authorization instanceof NextResponse) return authorization;
  try {
    const payload = await request.json() as Record<string, unknown>;
    const kind = cleanText(payload.kind);
    const db = getDb();

    if (kind === "menu") {
      const name = cleanText(payload.name);
      const category = cleanText(payload.category);
      if (!name || !category) throw new Error("Item name and category are required.");
      await db.insert(menuItems).values({
        name,
        category,
        price: positiveNumber(payload.price, "Price"),
        stockQty: nonNegativeNumber(payload.stockQty ?? 50, "Stock"),
        lowStockThreshold: nonNegativeNumber(payload.lowStockThreshold ?? 10, "Low-stock warning"),
      });
    } else if (kind === "menu-toggle") {
      const id = cleanText(payload.id);
      if (!id) throw new Error("Menu item is required.");
      await db.update(menuItems).set({ isAvailable: Boolean(payload.isAvailable) }).where(eq(menuItems.id, id));
    } else if (kind === "stock-update") {
      const id = cleanText(payload.id);
      if (!id) throw new Error("Menu item is required.");
      await db
        .update(menuItems)
        .set({
          stockQty: nonNegativeNumber(payload.stockQty, "Stock"),
          lowStockThreshold: nonNegativeNumber(
            payload.lowStockThreshold ?? 10,
            "Low-stock warning",
          ),
        })
        .where(eq(menuItems.id, id));
    } else if (kind === "sale" || kind === "expense" || kind === "transaction") {
      const type = payload.type === "expense" || kind === "expense" ? "expense" : "sale";
      await db.insert(transactions).values({
        type,
        category: cleanText(payload.category, type === "sale" ? "Counter sale" : "Other"),
        amount: positiveNumber(payload.amount, "Amount"),
        note: cleanText(payload.note),
        paymentMode: type === "sale" ? paymentMode(payload.paymentMode) : "cash",
        createdAt: transactionDate(payload.date, payload.time),
      });
    } else if (kind === "order") {
      const total = positiveNumber(payload.total, "Total");
      const itemCount = positiveNumber(payload.itemCount, "Item count");
      const customer = cleanText(payload.customer, "Walk-in") || "Walk-in";
      const paidBy = paymentMode(payload.paymentMode);
      const createdAt = transactionDate(payload.date, payload.time) ?? new Date();
      const [newOrder] = await db
        .insert(orders)
        .values({ customer, itemCount, total, createdAt })
        .returning();
      await db.insert(transactions).values({
        type: "sale",
        category: "Orders",
        amount: total,
        note: `Order #${newOrder.orderNo}`,
        paymentMode: paidBy,
        orderId: newOrder.id,
        createdAt,
      });
      const lines = Array.isArray(payload.items)
        ? payload.items
            .map((line) => line as Record<string, unknown>)
            .map((line) => ({
              menuItemId: cleanText(line.id) || null,
              name: cleanText(line.name, "Menu item"),
              quantity: positiveNumber(line.quantity, "Quantity"),
              unitPrice: positiveNumber(line.price, "Price"),
            }))
        : [];
      if (lines.length) {
        await db.insert(orderItems).values(
          lines.map((line) => ({ ...line, orderId: newOrder.id })),
        );
        for (const line of lines) {
          if (!line.menuItemId) continue;
          await db
            .update(menuItems)
            .set({
              stockQty: sql`greatest(0, ${menuItems.stockQty} - ${line.quantity})`,
            })
            .where(eq(menuItems.id, line.menuItemId));
        }
      }
    } else if (kind === "order-status") {
      const status = cleanText(payload.status);
      if (!(["preparing", "ready", "completed"] as string[]).includes(status)) throw new Error("Invalid order status.");
      await db.update(orders).set({ status: status as "preparing" | "ready" | "completed" }).where(eq(orders.id, cleanText(payload.id)));
    } else if (kind === "transaction-update") {
      const id = cleanText(payload.id);
      const type = payload.type === "expense" ? "expense" : "sale";
      await db
        .update(transactions)
        .set({
          type,
          category: cleanText(payload.category, type === "sale" ? "Counter sale" : "Other"),
          amount: positiveNumber(payload.amount, "Amount"),
          note: cleanText(payload.note),
          paymentMode: type === "sale" ? paymentMode(payload.paymentMode) : "cash",
          createdAt: transactionDate(payload.date, payload.time),
        })
        .where(eq(transactions.id, id));
    } else if (kind === "transaction-delete") {
      const id = cleanText(payload.id);
      const [entry] = await db
        .select({ orderId: transactions.orderId })
        .from(transactions)
        .where(eq(transactions.id, id));
      if (entry?.orderId) {
        const lines = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, entry.orderId));
        for (const line of lines) {
          if (!line.menuItemId) continue;
          await db
            .update(menuItems)
            .set({ stockQty: sql`${menuItems.stockQty} + ${line.quantity}` })
            .where(eq(menuItems.id, line.menuItemId));
        }
        await db.delete(transactions).where(eq(transactions.id, id));
        await db.delete(orders).where(eq(orders.id, entry.orderId));
      } else {
        await db.delete(transactions).where(eq(transactions.id, id));
      }
    } else if (kind === "order-update") {
      const id = cleanText(payload.id);
      const total = positiveNumber(payload.total, "Total");
      const createdAt = transactionDate(payload.date, payload.time);
      await db
        .update(orders)
        .set({
          customer: cleanText(payload.customer, "Walk-in") || "Walk-in",
          itemCount: positiveNumber(payload.itemCount, "Item count"),
          total,
          createdAt,
        })
        .where(eq(orders.id, id));
      await db
        .update(transactions)
        .set({
          amount: total,
          paymentMode: payload.paymentMode
            ? paymentMode(payload.paymentMode)
            : undefined,
          createdAt,
        })
        .where(eq(transactions.orderId, id));
    } else if (kind === "order-delete") {
      const id = cleanText(payload.id);
      const lines = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, id));
      for (const line of lines) {
        if (!line.menuItemId) continue;
        await db
          .update(menuItems)
          .set({ stockQty: sql`${menuItems.stockQty} + ${line.quantity}` })
          .where(eq(menuItems.id, line.menuItemId));
      }
      await db.delete(transactions).where(eq(transactions.orderId, id));
      await db.delete(orders).where(eq(orders.id, id));
    } else if (kind === "daily-closing") {
      const businessDate = cleanText(payload.businessDate);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(businessDate))
        throw new Error("Choose a valid closing date.");
      const openingCash = nonNegativeNumber(payload.openingCash, "Opening cash");
      const expectedCash = Number(payload.expectedCash);
      const actualCash = nonNegativeNumber(payload.actualCash, "Actual cash");
      if (!Number.isFinite(expectedCash)) throw new Error("Expected cash is invalid.");
      const values = {
        businessDate,
        openingCash,
        expectedCash: Math.round(expectedCash),
        actualCash,
        difference: actualCash - Math.round(expectedCash),
        closedAt: new Date(),
      };
      await db
        .insert(dailyClosings)
        .values(values)
        .onConflictDoUpdate({
          target: dailyClosings.businessDate,
          set: values,
        });
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
