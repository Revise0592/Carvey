import type { ThemeMode } from "@/lib/theme-options";

export const brandIconPaths = {
  light: "/icons/Carvey-plate-rear.png",
  dark: "/icons/Carvey-plate-front.png"
} as const;

export const faviconPath = "/icons/Favicon.png";

export type ResolvedThemeMode = keyof typeof brandIconPaths;

export function resolveThemeMode(mode: ThemeMode, prefersDark: boolean): ResolvedThemeMode {
  return mode === "dark" || (mode === "system" && prefersDark) ? "dark" : "light";
}

export function getBrandIconPath(mode: ResolvedThemeMode): string {
  return brandIconPaths[mode];
}
