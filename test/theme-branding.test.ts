import { describe, expect, it } from "vitest";
import { faviconPath, getBrandIconPath, resolveThemeMode } from "@/lib/theme-branding";

describe("theme branding", () => {
  it("selects light assets in light mode", () => {
    expect(resolveThemeMode("light", true)).toBe("light");
    expect(getBrandIconPath("light")).toBe("/icons/Carvey-plate-rear.png");
  });

  it("selects dark assets in dark mode", () => {
    expect(resolveThemeMode("dark", false)).toBe("dark");
    expect(getBrandIconPath("dark")).toBe("/icons/Carvey-plate-front.png");
  });

  it("follows the system preference in system mode", () => {
    expect(resolveThemeMode("system", false)).toBe("light");
    expect(resolveThemeMode("system", true)).toBe("dark");
  });

  it("uses one favicon for all themes", () => {
    expect(faviconPath).toBe("/icons/Favicon.png");
  });
});
