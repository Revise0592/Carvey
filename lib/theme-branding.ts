import type { ThemeMode } from "@/lib/theme-options";

export const brandIconPaths = {
  light: {
    svg: "/icons/svg/carvey-icon-light.svg",
    png: "/icons/png/carvey-icon-light-1024.png"
  },
  dark: {
    svg: "/icons/svg/carvey-icon-dark.svg",
    png: "/icons/png/carvey-icon-dark-1024.png"
  }
} as const;

export const brandWordmarkPaths = {
  light: "/icons/png/carvey-wordmark-black-512.png",
  dark: "/icons/png/carvey-wordmark-white-512.png"
} as const;

export type ResolvedThemeMode = keyof typeof brandIconPaths;

export function resolveThemeMode(mode: ThemeMode, prefersDark: boolean): ResolvedThemeMode {
  return mode === "dark" || (mode === "system" && prefersDark) ? "dark" : "light";
}

export function getBrandIconPath(mode: ResolvedThemeMode, format: "svg" | "png"): string {
  return brandIconPaths[mode][format];
}

export function getBrandWordmarkPath(mode: ResolvedThemeMode): string {
  return brandWordmarkPaths[mode];
}
