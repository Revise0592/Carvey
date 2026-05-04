import type { Metadata, Viewport } from "next";
import { ThemeScript } from "@/components/ThemeScript";
import { brandIconPaths } from "@/lib/theme-branding";
import "./globals.css";

export const metadata: Metadata = {
  title: "Carvey",
  description: "A self-hosted car maintenance dashboard.",
  icons: {
    icon: "/icons/favicon.svg",
    shortcut: "/icons/favicon.svg",
    apple: brandIconPaths.light.png
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <body>
        <ThemeScript />
        {children}
      </body>
    </html>
  );
}
