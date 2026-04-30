export const themeModes = ["system", "light", "dark"] as const;
export type ThemeMode = (typeof themeModes)[number];

export const themePalettes = [
  {
    id: "factory",
    label: "Factory",
    swatches: ["#0f766e", "#eceef2", "#17181c"]
  },
  {
    id: "british-racing",
    label: "British Racing",
    swatches: ["#0f3d2e", "#f4f0e6", "#c7a45d"]
  },
  {
    id: "midnight-alloy",
    label: "Midnight Alloy",
    swatches: ["#5f6875", "#e8ebef", "#20242b"]
  },
  {
    id: "tan-leather",
    label: "Tan Leather",
    swatches: ["#a15c2f", "#f6efe5", "#3a2419"]
  },
  {
    id: "signal-red",
    label: "Signal Red",
    swatches: ["#b42318", "#f3eeee", "#241617"]
  },
  {
    id: "petrol-blue",
    label: "Petrol Blue",
    swatches: ["#126b8f", "#eef5f6", "#102633"]
  }
] as const;

export type ThemePalette = (typeof themePalettes)[number]["id"];

export function isThemeMode(value: string | null): value is ThemeMode {
  return themeModes.includes(value as ThemeMode);
}

export function isThemePalette(value: string | null): value is ThemePalette {
  return themePalettes.some((palette) => palette.id === value);
}

export function normalizeThemeMode(value: string | null): ThemeMode {
  return isThemeMode(value) ? value : "system";
}

export function normalizeThemePalette(value: string | null): ThemePalette {
  return isThemePalette(value) ? value : "factory";
}
