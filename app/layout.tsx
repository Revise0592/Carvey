import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { ThemeScript } from "@/components/ThemeScript";
import { PwaRegistration } from "@/components/PwaRegistration";
import { faviconPath } from "@/lib/theme-branding";
import "./globals.css";

export const metadata: Metadata = {
  title: "Carvey",
  description: "A self-hosted car maintenance dashboard.",
  manifest: "/manifest.json",
  icons: {
    icon: faviconPath,
    shortcut: faviconPath,
    apple: faviconPath
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f766e" },
    { media: "(prefers-color-scheme: dark)",  color: "#101114" }
  ]
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Set by proxy.ts. Reading it also makes every page render per request, which nonces need.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <body>
        <ThemeScript nonce={nonce} />
        <PwaRegistration />
        {children}
      </body>
    </html>
  );
}
