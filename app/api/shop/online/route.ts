import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { onlineOrders } from "@/db/schema";
import { authorizeShopRequest } from "@/lib/shop-auth";
import { transitions } from "@/lib/online-ordering";
export const dynamic = "force-dynamic";
const reply = (body: unknown, status=200) => NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(request: Request) {
  const auth=await authorizeShopRequest(request);
  if(auth instanceof NextResponse) return auth;
  try { return reply({orders:await getDb().select().from(onlineOrders).orderBy(desc(onlineOrders.createdAt)).limit(200)}); }
  catch {return reply({error:"Order inbox unavailable. Apply the online-order migration."},503);}
}
export async function PATCH(request: Request) {
  const auth=await authorizeShopRequest(request);
  if(auth instanceof NextResponse) return auth;
  try {
    const p=z.object({id:z.string().uuid(),status:z.string().max(30)}).parse(await request.json());
    const db=getDb();
    const [row]=await db.select().from(onlineOrders).where(eq(onlineOrders.id,p.id));
    if(!row || !transitions[row.status]?.includes(p.status) || (p.status==="out_for_delivery" && row.fulfillment!=="delivery")) return reply({error:"Invalid order transition."},409);
    const [updated]=await db.update(onlineOrders).set({status:p.status,updatedAt:new Date()}).where(and(eq(onlineOrders.id,p.id),eq(onlineOrders.status,row.status))).returning({id:onlineOrders.id});
    return updated?reply({ok:true}):reply({error:"Order changed. Refresh."},409);
  } catch {return reply({error:"Could not update order."},400);}
}
