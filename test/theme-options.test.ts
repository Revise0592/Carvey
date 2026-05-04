import { describe, expect, it } from "vitest";
import { normalizeThemeMode, normalizeThemePalette, themePalettes } from "@/lib/theme-options";

describe("theme options", () => {
  it("normalizes theme modes with system as the fallback", () => {
    expect(normalizeThemeMode("dark")).toBe("dark");
    expect(normalizeThemeMode("light")).toBe("light");
    expect(normalizeThemeMode("nope")).toBe("system");
    expect(normalizeThemeMode(null)).toBe("system");
  });

  it("normalizes car palettes with factory as the fallback", () => {
    expect(normalizeThemePalette("british-racing")).toBe("british-racing");
    expect(normalizeThemePalette("petrol-blue")).toBe("petrol-blue");
    expect(normalizeThemePalette("heritage-cream")).toBe("heritage-cream");
    expect(normalizeThemePalette("oxford-blue")).toBe("oxford-blue");
    expect(normalizeThemePalette("burgundy-velour")).toBe("burgundy-velour");
    expect(normalizeThemePalette("champagne-gold")).toBe("champagne-gold");
    expect(normalizeThemePalette("unknown")).toBe("factory");
    expect(normalizeThemePalette(null)).toBe("factory");
  });

  it("ships the planned subtle car palettes", () => {
    expect(themePalettes.map((palette) => palette.id)).toEqual([
      "factory",
      "british-racing",
      "midnight-alloy",
      "tan-leather",
      "signal-red",
      "petrol-blue",
      "heritage-cream",
      "oxford-blue",
      "burgundy-velour",
      "champagne-gold"
    ]);
  });
});
