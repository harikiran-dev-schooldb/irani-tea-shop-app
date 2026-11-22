import type { Metadata, Viewport } from "next";

import ClerkAppProvider from "@/components/ClerkAppProvider";
import "./globals.css";
import "./premium.css";
import "./business.css";
import "./pwa.css";

export const metadata: Metadata = {
  applicationName: "Irani Tea",
  title: "Irani Tea — Shop Manager",
  description: "Irani Tea POS, ingredient inventory, recipe costing and business profit reports.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Irani Tea",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#180808",
  colorScheme: "light",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ClerkAppProvider>{children}</ClerkAppProvider>
      </body>
    </html>
  );
}
