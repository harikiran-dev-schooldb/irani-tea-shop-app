"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Coffee, ShoppingBag, ReceiptText, Minus, Plus, Search } from "lucide-react";
import "@/app/online-ordering.css";
type Item={id:string;name:string;category:string;price:number};
type Menu={items:Item[];enabled:boolean;delivery:boolean;fee:number;minimum:number};
type Tracking={id:string;status:string;total:number;fulfillment?:string};
const rupees=(n:number)=>"₹"+n.toLocaleString("en-IN");
export default function Storefront(){
 const [menu,setMenu]=useState<Menu|null>(null),[cart,setCart]=useState<Record<string,number>>({}),[query,setQuery]=useState(""),[category,setCategory]=useState("All"),[tab,setTab]=useState("menu"),[customer,setCustomer]=useState(""),[phone,setPhone]=useState(""),[address,setAddress]=useState(""),[fulfillment,setFulfillment]=useState("pickup"),[error,setError]=useState(""),[busy,setBusy]=useState(false),[tracking,setTracking]=useState<Tracking|null>(null),[code,setCode]=useState("");
 const checkout=useRef<string|null>(null),inFlight=useRef(false);
 useEffect(()=>{
   let alive=true;
   fetch("/api/online/menu",{cache:"no-store"}).then(async r=>{if(!r.ok)throw Error("Menu unavailable");return r.json() as Promise<Menu>;}).then(m=>{if(alive)setMenu(m);}).catch(()=>{if(alive)setError("Unable to load menu. Refresh to retry.");});
   if("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(()=>{});
   return()=>{alive=false;};
 },[]);
 useEffect(()=>{
   if(tab!=="orders"||!tracking?.id)return;
   const id=tracking.id;
   const timer=window.setInterval(()=>{void fetch("/api/online/orders",{headers:{"x-order-token":id},cache:"no-store"}).then(r=>r.ok?r.json():null).then(v=>{if(v)setTracking(v as Tracking);}).catch(()=>{});},8000);
   return()=>window.clearInterval(timer);
 },[tab,tracking?.id]);
 const items=menu?.items??[], selected=items.filter(i=>cart[i.id]>0),subtotal=selected.reduce((n,i)=>n+i.price*cart[i.id],0),count=selected.reduce((n,i)=>n+cart[i.id],0),fee=fulfillment==="delivery"?(menu?.fee??0):0;
 function change(id:string,delta:number){checkout.current=null;setCart(c=>({...c,[id]:Math.min(20,Math.max(0,(c[id]??0)+delta))}));}
 async function track(value:string){setError("");try{const r=await fetch("/api/online/orders",{headers:{"x-order-token":value.trim()},cache:"no-store"});const v=await r.json() as Tracking & {error?:string};if(!r.ok)throw Error(v.error||"Request failed");setTracking(v);setCode(value.trim());}catch(e){setError(e instanceof Error?e.message:"Tracking unavailable");}}
 async function place(e:React.FormEvent){e.preventDefault();if(inFlight.current||!menu?.enabled||!selected.length)return;inFlight.current=true;setBusy(true);setError("");
   const id=checkout.current??crypto.randomUUID();checkout.current=id;
   try{const r=await fetch("/api/online/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,customer,phone,fulfillment,address,items:selected.map(i=>({id:i.id,quantity:cart[i.id]})),total:subtotal+fee})});const v=await r.json() as Tracking & {error?:string};if(!r.ok)throw Error(v.error||"Request failed");setTracking({...v,fulfillment});setCode(id);setCart({});setAddress("");setCustomer("");setPhone("");checkout.current=null;setTab("orders");}catch(e){setError(e instanceof Error?e.message:"Order failed. Retry the same checkout.");}finally{inFlight.current=false;setBusy(false);}}
 const categories=["All",...new Set(items.map(i=>i.category))];
 const tabs=[{key:"menu",label:"Menu",Icon:Coffee},{key:"cart",label:"Cart",Icon:ShoppingBag},{key:"orders",label:"Track",Icon:ReceiptText}];
 return <main className="oo"><header className="oo-header"><div className="oo-brand"><Coffee size={30}/><div><strong>Irani Tea</strong><small>Freshly brewed. Made for you.</small></div></div><button onClick={()=>setTab("cart")}><ShoppingBag size={19}/> {count}</button></header>
 {error&&<p className="oo-error" role="alert">{error}</p>}
 {tab==="menu"&&<><section className="oo-hero"><Image src="/irani-tea-banner.png" alt="Irani tea and snacks" width={1000} height={420} priority/><div><small>YOUR LOCAL TEA SHOP</small><h1>Good tea. Great moments.</h1><p>{menu?.enabled?"Order ahead and skip the wait.":"Browse our menu. Online checkout is currently closed."}</p></div></section>
 <label className="oo-search"><Search size={18}/><input placeholder="Search tea, biscuits and more" value={query} onChange={e=>setQuery(e.target.value)}/></label>
 <div className="oo-categories">{categories.map(c=><button key={c} aria-pressed={c===category} onClick={()=>setCategory(c)}>{c}</button>)}</div>
 <h2>Our menu</h2><div className="oo-grid">{items.filter(i=>(category==="All"||i.category===category)&&i.name.toLowerCase().includes(query.toLowerCase())).map(i=><article key={i.id} className="oo-card"><div className="oo-product-icon"><Coffee size={30}/></div><small>{i.category}</small><h3>{i.name}</h3><div className="oo-row"><strong>{rupees(i.price)}</strong><button disabled={!menu?.enabled} onClick={()=>change(i.id,1)}><Plus size={16}/> Add {cart[i.id]>0?"("+cart[i.id]+")":""}</button></div></article>)}</div>{menu&&items.length===0&&<p>No items available right now.</p>}</>}
 {tab==="cart"&&<section><h1>Your cart</h1>{!count?<p>Your cart is empty. Choose something from our menu.</p>:<><div className="oo-panel">{selected.map(i=><div className="oo-row" key={i.id}><span>{i.name}<small>{rupees(i.price)} each</small></span><div className="oo-row"><button disabled={busy} aria-label={"Remove "+i.name} onClick={()=>change(i.id,-1)}><Minus size={15}/></button>{cart[i.id]}<button disabled={busy} aria-label={"Add "+i.name} onClick={()=>change(i.id,1)}><Plus size={15}/></button></div></div>)}</div>
 <form className="oo-panel oo-form" onSubmit={place}><h2>Checkout</h2><label>Order type<select disabled={busy} value={fulfillment} onChange={e=>setFulfillment(e.target.value)}><option value="pickup">Shop pickup</option>{menu?.delivery&&<option value="delivery">Local delivery (shop confirmation required)</option>}</select></label><label>Name<input required minLength={2} maxLength={80} value={customer} onChange={e=>setCustomer(e.target.value)} disabled={busy}/></label><label>Mobile number<input required type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={phone} onChange={e=>setPhone(e.target.value)} disabled={busy}/></label>{fulfillment==="delivery"&&<label>Delivery address<textarea required minLength={10} maxLength={300} value={address} onChange={e=>setAddress(e.target.value)} disabled={busy}/></label>}
 <p>Pay at pickup or on delivery. The shop must confirm your order. Stock is not reserved until the sale is recorded.</p><div className="oo-row"><span>Subtotal</span><strong>{rupees(subtotal)}</strong></div><div className="oo-row"><span>Delivery</span><strong>{rupees(fee)}</strong></div><div className="oo-row"><strong>Total</strong><strong>{rupees(subtotal+fee)}</strong></div>{fulfillment==="delivery"&&<small>Minimum delivery order: {rupees(menu?.minimum??0)}</small>}<small>By ordering you agree to the use of your contact details to fulfill this order. <Link href="/privacy">Privacy policy</Link></small><button className="oo-primary" disabled={busy||!menu?.enabled||(fulfillment==="delivery"&&subtotal<(menu?.minimum??0))}>{busy?"Submitting…":"Request order · "+rupees(subtotal+fee)}</button></form></>}</section>}
 {tab==="orders"&&<section><h1>Track your order</h1><div className="oo-panel oo-form"><label>Private tracking code<input value={code} onChange={e=>setCode(e.target.value)} placeholder="Paste your order code"/></label><button onClick={()=>void track(code)}>Check status</button>{tracking&&<><h2>{tracking.status.replaceAll("_"," ")}</h2><strong>{rupees(tracking.total)}</strong><p>Keep your tracking code private. Copy it to check your order later.</p><code className="oo-code">{tracking.id}</code><button onClick={()=>void navigator.clipboard.writeText(tracking.id).catch(()=>setError("Select and copy the code manually."))}>Copy tracking code</button><small>Updates automatically while this page is open. No live GPS tracking.</small></>}</div></section>}
 <footer className="oo-bottom">{tabs.map(({key,label,Icon})=>{return <button key={String(key)} aria-current={tab===key?"page":undefined} onClick={()=>{setTab(String(key));setError("");}} disabled={busy}><Icon size={21}/><span>{String(label)}{key==="cart"&&count?" ("+count+")":""}</span></button>;})}</footer></main>;
}
