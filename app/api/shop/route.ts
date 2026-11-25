import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { getDb } from "@/db";
import {
  dailyClosings,
  ingredientMovements,
  ingredients,
  recipeIngredients,
  menuItems,
  orderItems,
  onlineOrders,
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
    let createdOrderId: string | undefined;

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
    } else if (kind === "stock-adjust") {
      const id = cleanText(payload.id);
      const delta = Number(payload.delta);
      if (!id || !Number.isInteger(delta) || ![-1, 1].includes(delta)) {
        throw new Error("Choose a valid stock adjustment.");
      }
      const [updated] = await db.update(menuItems)
        .set({ stockQty: sql`${menuItems.stockQty} + ${delta}` })
        .where(and(eq(menuItems.id, id), sql`${menuItems.stockQty} + ${delta} >= 0`))
        .returning({ id: menuItems.id });
      if (!updated) throw new Error("Not enough stock. Refresh menu quantities and try again.");
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
    } else if (kind === "order" || kind === "online-order-complete") {
      let online: typeof onlineOrders.$inferSelect | undefined;
      if (kind === "online-order-complete") {
        const id = cleanText(payload.id);
        if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid online order.");
        [online] = await db.select().from(onlineOrders).where(eq(onlineOrders.id, id));
        if (!online || online.status !== (online.fulfillment === "delivery" ? "out_for_delivery" : "ready") || online.posOrderId)
          throw new Error("Order is not ready for payment or was already completed.");
        if (payload.paymentMode !== "cash" && payload.paymentMode !== "online") throw new Error("Confirm payment received.");
        payload.customer = online.customer;
        payload.items = online.lines;
        payload.total = online.total;
        payload.itemCount = online.lines.reduce((sum, line) => sum + line.quantity, 0);
        delete payload.date;
        delete payload.time;
      }
      const customer = cleanText(payload.customer, "Walk-in") || "Walk-in";
      const paidBy = paymentMode(payload.paymentMode);
      const createdAt = transactionDate(payload.date, payload.time) ?? new Date();
      const rawLines = Array.isArray(payload.items) ? payload.items : [];
      if (rawLines.length > 100) throw new Error("An order can contain at most 100 different menu lines.");
      const lines = rawLines.map((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          throw new Error("Invalid order item.");
        }
        const item = entry as Record<string, unknown>;
        const menuItemId = cleanText(item.id);
        if (!menuItemId) throw new Error("Select a valid menu item.");
        return { menuItemId, quantity: positiveNumber(item.quantity, "Quantity") };
      });
      const quantities = new Map<string, number>();
      for (const line of lines) {
        quantities.set(line.menuItemId, (quantities.get(line.menuItemId) ?? 0) + line.quantity);
      }
      const selectedMenu = quantities.size
        ? await db.select().from(menuItems).where(inArray(menuItems.id, [...quantities.keys()]))
        : [];
      const menuById = new Map(selectedMenu.map((item) => [item.id, item]));
      for (const [id, quantity] of quantities) {
        const item = menuById.get(id);
        if (!item || !item.isAvailable) throw new Error("A menu item is no longer available. Refresh the menu.");
        if (item.stockQty < quantity) {
          throw new Error(`Not enough ${item.name} in stock (available: ${item.stockQty}).`);
        }
      }
      const verifiedLines = lines.map((line) => {
        const item = menuById.get(line.menuItemId)!;
        return { ...line, name: item.name, unitPrice: item.price };
      });
      const total = positiveNumber(payload.total, "Total");
      const itemCount = positiveNumber(payload.itemCount, "Item count");
      if (verifiedLines.length) {
        const actualCount = verifiedLines.reduce((sum, line) => sum + line.quantity, 0);
        const actualTotal = verifiedLines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0) + (online?.deliveryFee ?? 0);
        if (online && verifiedLines.some(line => online!.lines.find(item => item.id === line.menuItemId)?.unitPrice !== line.unitPrice)) throw new Error("Menu price changed since the order was placed. Resolve with the customer before completing.");
        if (itemCount !== actualCount || total !== actualTotal) {
          throw new Error("The menu price or item quantity changed. Refresh your order and try again.");
        }
      }
      const recipes = quantities.size
        ? await db.select().from(recipeIngredients)
            .where(inArray(recipeIngredients.menuItemId, [...quantities.keys()]))
        : [];
      const ingredientQuantities = new Map<string, number>();
      for (const recipe of recipes) {
        const count = quantities.get(recipe.menuItemId) ?? 0;
        ingredientQuantities.set(
          recipe.ingredientId,
          (ingredientQuantities.get(recipe.ingredientId) ?? 0) + recipe.quantity * count,
        );
      }
      const selectedIngredients = ingredientQuantities.size
        ? await db.select().from(ingredients)
            .where(inArray(ingredients.id, [...ingredientQuantities.keys()]))
        : [];
      const ingredientById = new Map(selectedIngredients.map((item) => [item.id, item]));
      for (const [ingredientId, required] of ingredientQuantities) {
        const ingredient = ingredientById.get(ingredientId);
        if (!ingredient || ingredient.stockQty < required) {
          throw new Error(`Insufficient ${ingredient?.name ?? "ingredient"} to complete this order. Replenish stock.`);
        }
      }
      const orderId = randomUUID();
      // Neon HTTP batch is atomic: order, payment, items, and inventory succeed
      // together. Concurrent stock shortages fail the final checks and roll back.
      await db.batch([
        ...(online ? [
          db.update(onlineOrders).set({status:"completed",posOrderId:orderId,updatedAt:new Date()}).where(and(eq(onlineOrders.id,online.id),eq(onlineOrders.status,online.status),sql`${onlineOrders.posOrderId} is null`)),
          db.execute(sql`select 1 / (case when exists (select 1 from ${onlineOrders} where ${onlineOrders.id} = ${online.id} and ${onlineOrders.posOrderId} = ${orderId}) then 1 else 0 end)`),
        ] : []),
        db.insert(orders).values({ id: orderId, customer, itemCount, total, createdAt, ...(online ? {status:"completed" as const} : {}) }),
        db.insert(transactions).values({
          type: "sale", category: online ? "Online orders" : "Orders", amount: total,
          note: sql`'Order #' || (select ${orders.orderNo} from ${orders} where ${orders.id} = ${orderId})`,
          paymentMode: paidBy, orderId, createdAt,
        }),
        ...(verifiedLines.length
          ? [db.insert(orderItems).values(verifiedLines.map((line) => ({ ...line, orderId })))]
          : []),
        ...[...quantities].map(([id, quantity]) =>
          db.update(menuItems)
            .set({ stockQty: sql`${menuItems.stockQty} - ${quantity}` })
            .where(eq(menuItems.id, id)),
        ),
        ...[...quantities].map(([id]) =>
          db.execute(sql`select 1 / (case when exists (
            select 1 from ${menuItems}
            where ${menuItems.id} = ${id} and ${menuItems.stockQty} >= 0
          ) then 1 else 0 end) as inventory_valid`),
        ),
        ...[...ingredientQuantities].map(([ingredientId, quantity]) =>
          db.update(ingredients)
            .set({ stockQty: sql`${ingredients.stockQty} - ${quantity}` })
            .where(eq(ingredients.id, ingredientId)),
        ),
        ...(ingredientQuantities.size
          ? [db.insert(ingredientMovements).values([...ingredientQuantities].map(([ingredientId, quantity]) => ({
              ingredientId,
              orderId,
              quantityChange: -quantity,
              unitCostPaise: ingredientById.get(ingredientId)!.unitCostPaise,
              reason: "consumption",
              note: "Recipe consumption",
              createdAt,
            })))]
          : []),
        ...[...ingredientQuantities].map(([ingredientId]) =>
          db.execute(sql`select 1 / (case when exists (
            select 1 from ${ingredients}
            where ${ingredients.id} = ${ingredientId} and ${ingredients.stockQty} >= 0
          ) then 1 else 0 end) as ingredient_stock_valid`),
        ),
      ]);
      createdOrderId = orderId;
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
        const [lines, consumed] = await Promise.all([
          db.select().from(orderItems).where(eq(orderItems.orderId, entry.orderId)),
          db.select().from(ingredientMovements).where(and(
            eq(ingredientMovements.orderId, entry.orderId), eq(ingredientMovements.reason, "consumption"),
          )),
        ]);
        await db.batch([
          db.delete(transactions).where(eq(transactions.id, id)),
          ...lines.filter((line) => Boolean(line.menuItemId)).map((line) =>
            db.update(menuItems)
              .set({ stockQty: sql`${menuItems.stockQty} + ${line.quantity}` })
              .where(eq(menuItems.id, line.menuItemId!)),
          ),
          ...consumed.map((movement) =>
            db.update(ingredients)
              .set({ stockQty: sql`${ingredients.stockQty} - ${movement.quantityChange}` })
              .where(eq(ingredients.id, movement.ingredientId)),
          ),
          db.delete(orders).where(eq(orders.id, entry.orderId!)),
        ]);
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
      const [lines, consumed] = await Promise.all([
        db.select().from(orderItems).where(eq(orderItems.orderId, id)),
        db.select().from(ingredientMovements).where(and(
          eq(ingredientMovements.orderId, id), eq(ingredientMovements.reason, "consumption"),
        )),
      ]);
      await db.batch([
        db.delete(transactions).where(eq(transactions.orderId, id)),
        ...lines.filter((line) => Boolean(line.menuItemId)).map((line) =>
          db.update(menuItems)
            .set({ stockQty: sql`${menuItems.stockQty} + ${line.quantity}` })
            .where(eq(menuItems.id, line.menuItemId!)),
        ),
        ...consumed.map((movement) =>
          db.update(ingredients)
            .set({ stockQty: sql`${ingredients.stockQty} - ${movement.quantityChange}` })
            .where(eq(ingredients.id, movement.ingredientId)),
        ),
        db.delete(orders).where(eq(orders.id, id)),
      ]);
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

    return NextResponse.json({ ...(await readShop()), createdOrderId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save this entry.";
    console.error("Could not update shop data", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
