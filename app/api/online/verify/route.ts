import { NextResponse } from "next/server";
import { z } from "zod";
import { otpConfigured, issueProof, throttle, verifyProvider } from "@/lib/customer-verification";
import { onlineEnabled } from "@/lib/online-ordering";
export const dynamic="force-dynamic";
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const schema=z.object({phone:z.string().regex(/^[6-9]\d{9}$/),id:z.string().uuid(),code:z.string().regex(/^\d{4,10}$/).optional()});
export async function POST(request:Request){
 if(!onlineEnabled()||!otpConfigured())return reply({error:"Customer verification is not available yet."},503);
 if(request.headers.get("origin")!==new URL(request.url).origin)return reply({error:"Invalid origin."},403);
 try{
   const raw=await request.text();
   if(raw.length>1000)return reply({error:"Request too large."},413);
   const input=schema.safeParse(JSON.parse(raw));
   if(!input.success)return reply({error:"Check your phone or verification code."},400);
   const {phone,id,code}=input.data;
   if(!await throttle(phone,code?"check":"send"))return reply({error:"Too many requests. Please try again later."},429);
   if(!await verifyProvider(phone,code))return reply({error:code?"Invalid or expired code.":"Could not send a code."},400);
   return code?reply({proof:issueProof(phone,id)}):reply({sent:true});
 }catch{return reply({error:"Verification unavailable. Try again later."},503);}
}
