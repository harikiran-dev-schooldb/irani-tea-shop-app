import { and, eq, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { otpConfigured } from "@/lib/customer-verification";
import { getDb } from "@/db";
import { menuItems } from "@/db/schema";
import { onlineEnabled, deliveryEnabled, deliveryFee, deliveryMinimum } from "@/lib/online-ordering";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const items = await getDb().select({ id: menuItems.id, name: menuItems.name, category: menuItems.category, price: menuItems.price })
      .from(menuItems).where(and(eq(menuItems.isAvailable, true), gt(menuItems.stockQty, 0), gt(menuItems.price, 0))).orderBy(menuItems.category, menuItems.name);
    return NextResponse.json({ items, enabled: onlineEnabled() && otpConfigured(), delivery: deliveryEnabled(), fee: deliveryFee(), minimum: deliveryMinimum() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Menu temporarily unavailable." }, { status: 503 });
  }
}
