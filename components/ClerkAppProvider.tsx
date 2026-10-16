"use client";

import { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";

export default function ClerkAppProvider({ children }: { children: ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
