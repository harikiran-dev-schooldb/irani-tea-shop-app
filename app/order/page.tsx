import type { Metadata } from "next";
import Storefront from "@/components/OnlineStorefront";
export const metadata: Metadata = {title:"Order Irani Tea",description:"Order freshly brewed tea and snacks for pickup or local delivery.",manifest:"/customer.webmanifest",appleWebApp:{capable:true,title:"Order Irani Tea"}};
export default function Page(){return <Storefront/>;}
