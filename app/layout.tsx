import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Irani Tea — Shop Manager",
  description: "Menu, orders, cashflow and expenses for an Irani Tea shop.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
