import type { Metadata, Viewport } from "next";
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <body>
        <ThemeScript />
        <PwaRegistration />
        {children}
      </body>
    </html>
  );
}
