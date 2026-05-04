import type { ThemeMode } from "@/lib/theme-options";

export const brandIconPaths = {
  light: {
    svg: "/icons/icon-light.svg",
    png: "/icons/icon-light.png"
  },
  dark: {
    svg: "/icons/icon-dark.svg",
    png: "/icons/icon-dark.png"
  }
} as const;

export type ResolvedThemeMode = keyof typeof brandIconPaths;

export function resolveThemeMode(mode: ThemeMode, prefersDark: boolean): ResolvedThemeMode {
  return mode === "dark" || (mode === "system" && prefersDark) ? "dark" : "light";
}

export function getBrandIconPath(mode: ResolvedThemeMode, format: "svg" | "png"): string {
  return brandIconPaths[mode][format];
}
