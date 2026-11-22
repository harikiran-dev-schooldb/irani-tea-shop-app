import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { ingredientMovements, ingredientPurchases, orderItems, orders, recipeIngredients, transactions } from "@/db/schema";
import { authorizeShopRequest } from "@/lib/shop-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseDate(raw: string | null, fallback: string): string {
  const date = raw?.trim() || fallback;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new Error("Use a valid report date in YYYY-MM-DD format.");
  }
  return date;
}
function istRange(from: string, to: string) {
  if (from > to) throw new Error("Start date cannot be after end date.");
  const start = new Date(`${from}T00:00:00+05:30`);
  const end = new Date(new Date(`${to}T00:00:00+05:30`).getTime() + 86_400_000);
  return { start, end };
}
const rupees = (paise: number) => Math.round(paise) / 100;
const csvValue = (value: string | number) => {
  const data = String(value);
  return `"${data.replaceAll('"', '""')}"`;
};

export async function GET(request: Request) {
  const auth = await authorizeShopRequest(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const url = new URL(request.url);
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    const from = parseDate(url.searchParams.get("from"), "2000-01-01");
    const to = parseDate(url.searchParams.get("to"), today);
    const { start, end } = istRange(from, to);
    const db = getDb();
    const transactionDay = sql<string>`to_char(${transactions.createdAt} AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')`;
    const movementDay = sql<string>`to_char(${ingredientMovements.createdAt} AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')`;
    const purchaseDay = sql<string>`to_char(${ingredientPurchases.createdAt} AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')`;
    const orderDay = sql<string>`to_char(${orders.createdAt} AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')`;

    const [transactionsByDay, consumptionByDay, purchasesByDay, ordersByDay, topProducts, recipeCount] = await Promise.all([
      db.select({
        date: transactionDay,
        type: transactions.type,
        paymentMode: transactions.paymentMode,
        amount: sql<number>`coalesce(sum(${transactions.amount}), 0)::integer`,
      }).from(transactions)
        .where(and(gte(transactions.createdAt, start), lt(transactions.createdAt, end)))
        .groupBy(transactionDay, transactions.type, transactions.paymentMode),
      db.select({
        date: movementDay,
        reason: ingredientMovements.reason,
        costPaise: sql<number>`coalesce(sum(-${ingredientMovements.quantityChange} * ${ingredientMovements.unitCostPaise}), 0)::bigint`,
      }).from(ingredientMovements)
        .where(and(
          gte(ingredientMovements.createdAt, start), lt(ingredientMovements.createdAt, end),
          inArray(ingredientMovements.reason, ["consumption", "wastage", "correction-out"]),
        ))
        .groupBy(movementDay, ingredientMovements.reason),
      db.select({
        date: purchaseDay,
        costPaise: sql<number>`coalesce(sum(${ingredientPurchases.totalCostPaise}), 0)::bigint`,
      }).from(ingredientPurchases)
        .where(and(gte(ingredientPurchases.createdAt, start), lt(ingredientPurchases.createdAt, end)))
        .groupBy(purchaseDay),
      db.select({
        date: orderDay,
        count: sql<number>`count(*)::integer`,
      }).from(orders)
        .where(and(gte(orders.createdAt, start), lt(orders.createdAt, end)))
        .groupBy(orderDay),
      db.select({
        name: orderItems.name,
        quantity: sql<number>`sum(${orderItems.quantity})::bigint`,
        revenue: sql<number>`sum(${orderItems.quantity} * ${orderItems.unitPrice})::bigint`,
      }).from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(gte(orders.createdAt, start), lt(orders.createdAt, end)))
        .groupBy(orderItems.name)
        .orderBy(desc(sql`sum(${orderItems.quantity})`)).limit(10),
      db.select({ count: sql<number>`count(*)::integer` }).from(recipeIngredients),
    ]);

    type Day = { date: string; revenue: number; cash: number; online: number; expenses: number; cogs: number; wastage: number; purchases: number; orders: number; profit: number };
    const days = new Map<string, Day>();
    const getDay = (date: string) => {
      let row = days.get(date);
      if (!row) {
        row = { date, revenue: 0, cash: 0, online: 0, expenses: 0, cogs: 0, wastage: 0, purchases: 0, orders: 0, profit: 0 };
        days.set(date, row);
      }
      return row;
    };
    for (const item of transactionsByDay) {
      const day = getDay(item.date);
      const amount = Number(item.amount);
      if (item.type === "sale") {
        day.revenue += amount;
        if (item.paymentMode === "online") day.online += amount;
        else day.cash += amount;
      } else day.expenses += amount;
    }
    for (const item of consumptionByDay) {
      const day = getDay(item.date);
      if (item.reason === "consumption") day.cogs += rupees(Number(item.costPaise));
      else day.wastage += rupees(Number(item.costPaise));
    }
    for (const item of purchasesByDay) getDay(item.date).purchases += rupees(Number(item.costPaise));
    for (const item of ordersByDay) getDay(item.date).orders += Number(item.count);
    const daily = [...days.values()].sort((a, b) => b.date.localeCompare(a.date));
    for (const day of daily) {
      day.profit = Number((day.revenue - day.expenses - day.cogs - day.wastage).toFixed(2));
    }
    const totals = daily.reduce((acc, item) => ({
      revenue: acc.revenue + item.revenue,
      cash: acc.cash + item.cash,
      online: acc.online + item.online,
      expenses: acc.expenses + item.expenses,
      cogs: acc.cogs + item.cogs,
      wastage: acc.wastage + item.wastage,
      purchases: acc.purchases + item.purchases,
      orders: acc.orders + item.orders,
      profit: acc.profit + item.profit,
    }), { revenue: 0, cash: 0, online: 0, expenses: 0, cogs: 0, wastage: 0, purchases: 0, orders: 0, profit: 0 });
    totals.profit = Number(totals.profit.toFixed(2));
    const report = {
      from, to, totals, daily, 
      topProducts: topProducts.map((item) => ({ name: item.name, quantity: Number(item.quantity), revenue: Number(item.revenue) })),
      configuredRecipeLines: Number(recipeCount[0]?.count ?? 0),
      accountingNote: "Ingredient purchases replenish inventory; consumption costs and wastage are expensed in profit. Avoid recording the same purchase as a separate operating expense.",
    };
    if (url.searchParams.get("format") === "csv") {
      const lines = [
        ["Date", "Revenue INR", "Cash INR", "UPI INR", "Expenses INR", "Ingredient COGS INR", "Wastage INR", "Purchases INR", "Orders", "Net profit INR"].join(","),
        ...daily.map((day) => [day.date, day.revenue, day.cash, day.online, day.expenses, day.cogs, day.wastage, day.purchases, day.orders, day.profit].map(csvValue).join(",")),
      ];
      return new Response("\uFEFF" + lines.join("\r\n"), { headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="irani-tea-profit-${from}-to-${to}.csv"`,
        "Cache-Control": "private, no-store",
      } });
    }
    return NextResponse.json(report, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Irani Tea profit report failed", error);
    return NextResponse.json({
      error: error instanceof Error && error.message.startsWith("Use a valid") ? error.message :
        error instanceof Error && error.message.startsWith("Start date") ? error.message :
          "Profit reports are unavailable. Ensure ingredient migration 0004 is applied.",
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
