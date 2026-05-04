import { describe, expect, it } from "vitest";
import { getBrandIconPath, resolveThemeMode } from "@/lib/theme-branding";

describe("theme branding", () => {
  it("selects light assets in light mode", () => {
    expect(resolveThemeMode("light", true)).toBe("light");
    expect(getBrandIconPath("light", "svg")).toBe("/icons/svg/carvey-icon-light.svg");
    expect(getBrandIconPath("light", "png")).toBe("/icons/png/carvey-icon-light-1024.png");
  });

  it("selects dark assets in dark mode", () => {
    expect(resolveThemeMode("dark", false)).toBe("dark");
    expect(getBrandIconPath("dark", "svg")).toBe("/icons/svg/carvey-icon-dark.svg");
    expect(getBrandIconPath("dark", "png")).toBe("/icons/png/carvey-icon-dark-1024.png");
  });

  it("follows the system preference in system mode", () => {
    expect(resolveThemeMode("system", false)).toBe("light");
    expect(resolveThemeMode("system", true)).toBe("dark");
  });
});
