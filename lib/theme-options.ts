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
  },
  {
    id: "heritage-cream",
    label: "Heritage Cream",
    swatches: ["#8e5a33", "#f7f1e4", "#33241c"]
  },
  {
    id: "oxford-blue",
    label: "Oxford Blue",
    swatches: ["#1f4b7a", "#eef1f4", "#102033"]
  },
  {
    id: "burgundy-velour",
    label: "Burgundy Velour",
    swatches: ["#7a2c3c", "#f6ece8", "#2d1a20"]
  },
  {
    id: "champagne-gold",
    label: "Champagne Gold",
    swatches: ["#b08a42", "#f5f0e2", "#394047"]
  }
] as const;

export type ThemePalette = (typeof themePalettes)[number]["id"];

export const themeShapes = ["rounded", "boxy"] as const;
export type ThemeShape = (typeof themeShapes)[number];

export function isThemeShape(value: string | null): value is ThemeShape {
  return themeShapes.includes(value as ThemeShape);
}

export function normalizeThemeShape(value: string | null): ThemeShape {
  return isThemeShape(value) ? value : "rounded";
}

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
