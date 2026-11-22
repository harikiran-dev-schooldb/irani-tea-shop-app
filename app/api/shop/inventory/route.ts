import { and, desc, eq, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { ingredientMovements, ingredientPurchases, ingredients, menuItems, recipeIngredients } from "@/db/schema";
import { authorizeShopRequest } from "@/lib/shop-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function textValue(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function quantityValue(value: unknown, field = "Quantity") {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0 || n > 1_000_000) {
    throw new Error(`${field} must be a positive whole number (maximum 1,000,000).`);
  }
  return n;
}
function costPaise(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 20_000_000) {
    throw new Error("Enter a valid purchase cost in rupees.");
  }
  return Math.round(n * 100);
}
async function readInventory() {
  const db = getDb();
  const [ingredientRows, recipeRows, purchaseRows, movementRows, menuRows] = await Promise.all([
    db.select().from(ingredients).orderBy(ingredients.name),
    db.select().from(recipeIngredients).orderBy(recipeIngredients.menuItemId),
    db.select().from(ingredientPurchases).orderBy(desc(ingredientPurchases.createdAt)).limit(100),
    db.select().from(ingredientMovements).orderBy(desc(ingredientMovements.createdAt)).limit(100),
    db.select({ id: menuItems.id, name: menuItems.name, category: menuItems.category, price: menuItems.price })
      .from(menuItems).orderBy(menuItems.category, menuItems.name),
  ]);
  return { ingredients: ingredientRows, recipes: recipeRows, purchases: purchaseRows, movements: movementRows, menu: menuRows };
}
function errorResponse(error: unknown) {
  console.error("Irani Tea inventory request failed", error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Inventory is unavailable." },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request) {
  const auth = await authorizeShopRequest(request);
  if (auth instanceof NextResponse) return auth;
  try {
    return NextResponse.json(await readInventory(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Inventory load failed", error);
    return NextResponse.json({ error: "Ingredient tables are unavailable. Apply migration 0004 first." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await authorizeShopRequest(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const value = await request.json() as Record<string, unknown>;
    const action = textValue(value.kind);
    const db = getDb();

    if (action === "ingredient-create") {
      const name = textValue(value.name, 80);
      const unit = textValue(value.unit, 10);
      const reorderAt = Number(value.reorderAt ?? 0);
      if (!name) throw new Error("Ingredient name is required.");
      if (!["ml", "g", "pcs"].includes(unit)) throw new Error("Choose ml, g, or pcs.");
      if (!Number.isSafeInteger(reorderAt) || reorderAt < 0 || reorderAt > 1_000_000) {
        throw new Error("Reorder level must be a non-negative whole number.");
      }
      await db.insert(ingredients).values({ name, unit, reorderAt });
    } else if (action === "ingredient-reorder") {
      const id = textValue(value.ingredientId);
      const reorderAt = Number(value.reorderAt);
      if (!id || !Number.isSafeInteger(reorderAt) || reorderAt < 0 || reorderAt > 1_000_000) {
        throw new Error("Invalid ingredient or reorder level.");
      }
      const [updated] = await db.update(ingredients).set({ reorderAt }).where(eq(ingredients.id, id)).returning({ id: ingredients.id });
      if (!updated) throw new Error("Ingredient not found.");
    } else if (action === "recipe-set") {
      const menuItemId = textValue(value.menuItemId);
      const ingredientId = textValue(value.ingredientId);
      const quantity = Number(value.quantity);
      if (!menuItemId || !ingredientId || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 100_000) {
        throw new Error("Select a menu item, ingredient, and valid recipe quantity.");
      }
      if (quantity === 0) {
        await db.delete(recipeIngredients).where(and(
          eq(recipeIngredients.menuItemId, menuItemId), eq(recipeIngredients.ingredientId, ingredientId),
        ));
      } else {
        await db.insert(recipeIngredients).values({ menuItemId, ingredientId, quantity }).onConflictDoUpdate({
          target: [recipeIngredients.menuItemId, recipeIngredients.ingredientId],
          set: { quantity },
        });
      }
    } else if (action === "purchase-create") {
      const ingredientId = textValue(value.ingredientId);
      const quantity = quantityValue(value.quantity);
      const totalCostPaise = costPaise(value.totalCost);
      const supplier = textValue(value.supplier, 120);
      const note = textValue(value.note, 300);
      const [item] = await db.select().from(ingredients).where(eq(ingredients.id, ingredientId)).limit(1);
      if (!item) throw new Error("Ingredient not found.");
      // Average cost per base unit is recalculated from the existing inventory
      // plus this purchase. Purchases do not create an operating expense twice.
      const updatedUnitCost = sql<number>`round(
        (${ingredients.stockQty}::numeric * ${ingredients.unitCostPaise} + ${totalCostPaise}) /
        (${ingredients.stockQty} + ${quantity})
      )::integer`;
      await db.batch([
        db.insert(ingredientPurchases).values({ ingredientId, quantity, totalCostPaise, supplier, note }),
        db.update(ingredients).set({
          unitCostPaise: updatedUnitCost,
          stockQty: sql`${ingredients.stockQty} + ${quantity}`,
        }).where(eq(ingredients.id, ingredientId)),
        db.insert(ingredientMovements).values({
          ingredientId, quantityChange: quantity, unitCostPaise: Math.round(totalCostPaise / quantity),
          reason: "purchase", note: supplier || note,
        }),
      ]);
    } else if (action === "ingredient-adjust") {
      const ingredientId = textValue(value.ingredientId);
      const amount = quantityValue(value.quantity);
      const reason = textValue(value.reason);
      if (!["wastage", "correction-in", "correction-out"].includes(reason)) {
        throw new Error("Select wastage, add stock, or remove stock.");
      }
      const delta = reason === "correction-in" ? amount : -amount;
      const note = textValue(value.note, 300);
      const [item] = await db.select().from(ingredients).where(eq(ingredients.id, ingredientId)).limit(1);
      if (!item) throw new Error("Ingredient not found.");
      // Database CHECK constraints reject stock going below zero. Because the
      // updates and movement insert run in one transaction, neither can
      // succeed without the other.
      await db.batch([
        db.update(ingredients)
          .set({ stockQty: sql`${ingredients.stockQty} + ${delta}` })
          .where(eq(ingredients.id, ingredientId)),
        db.insert(ingredientMovements).values({
          ingredientId, quantityChange: delta, unitCostPaise: item.unitCostPaise,
          reason, note,
        }),
      ]);
    } else {
      throw new Error("Unknown inventory operation.");
    }
    return NextResponse.json(await readInventory(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
