import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";
import { ApiTokenSync } from "../lib/api-token-sync";

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Kenzo EHS Platform",
  description: "Enterprise Environment, Health & Safety Management",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kenzo EHS",
  },
  icons: {
    icon: "/icon-192.svg",
    apple: "/apple-touch-icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ApiTokenSync />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
