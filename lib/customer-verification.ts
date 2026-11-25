import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
export function otpConfigured() {
  return /^AC[a-f0-9]{32}$/i.test(process.env.TWILIO_ACCOUNT_SID??"") &&
    /^VA[a-f0-9]{32}$/i.test(process.env.TWILIO_VERIFY_SERVICE_SID??"") &&
    Boolean(process.env.TWILIO_AUTH_TOKEN?.trim()) &&
    (process.env.ONLINE_OTP_SIGNING_SECRET?.length??0)>=32;
}
function signature(value:string) {
  const secret=process.env.ONLINE_OTP_SIGNING_SECRET;
  if(!secret || secret.length<32) throw Error("Verification not configured.");
  return createHmac("sha256",secret).update(value).digest("hex");
}
export function issueProof(phone:string,id:string) {
  const expires=Math.floor(Date.now()/1000)+600;
  return expires+"."+signature("proof:"+phone+":"+id+":"+expires);
}
export function validProof(phone:string,id:string,proof:string) {
  if(!otpConfigured()||!/^\d{10}\.[a-f0-9]{64}$/.test(proof))return false;
  const [expiry,mac]=proof.split(".");
  if(Number(expiry)<Math.floor(Date.now()/1000))return false;
  return timingSafeEqual(Buffer.from(mac,"hex"),Buffer.from(signature("proof:"+phone+":"+id+":"+expiry),"hex"));
}
async function hit(key:string,seconds:number,limit:number){
  const bucket=Math.floor(Date.now()/1000/seconds);
  const result=await getDb().execute(sql`insert into online_rate_limits ("key",bucket,hits) values (${key},${bucket},1)
    on conflict ("key") do update set hits=case when online_rate_limits.bucket=excluded.bucket then online_rate_limits.hits+1 else 1 end,bucket=excluded.bucket
    returning hits`);
  return Number(result.rows[0]?.hits)<=limit;
}
export async function throttle(phone:string,action:"send"|"check"){
  // Global limits cap provider costs even when attackers rotate phone numbers.
  if(!await hit("global:"+action,3600,action==="send"?30:150))return false;
  const key=signature("rate:"+phone);
  if(action==="send"&&!await hit("phone:cooldown:"+key,60,1))return false;
  return hit("phone:"+action+":"+key,3600,action==="send"?3:8);
}
export async function verifyProvider(phone:string,code?:string){
  const account=process.env.TWILIO_ACCOUNT_SID!,token=process.env.TWILIO_AUTH_TOKEN!,service=process.env.TWILIO_VERIFY_SERVICE_SID!;
  const response=await fetch("https://verify.twilio.com/v2/Services/"+service+"/"+(code?"VerificationCheck":"Verifications"),{
    method:"POST",headers:{Authorization:"Basic "+Buffer.from(account+":"+token).toString("base64"),"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams(code?{To:"+91"+phone,Code:code}:{To:"+91"+phone,Channel:"sms"}),
    cache:"no-store",signal:AbortSignal.timeout(10000),
  });
  const data=await response.json() as {status?:string};
  return response.ok && data.status===(code?"approved":"pending");
}
