import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chai Corner — Freshly brewed, right around the corner",
  description: "Freshly brewed chai and snacks, ready for pickup.",
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
