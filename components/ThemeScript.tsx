import Script from "next/script";
import { themePalettes, themeShapes } from "@/lib/theme-options";

export function ThemeScript() {
  const palettes = themePalettes.map((palette) => palette.id);
  const shapes = [...themeShapes];
  const script = `
    (() => {
      const modeKey = "carvey-theme";
      const paletteKey = "carvey-palette";
      const shapeKey = "carvey-shape";
      const modes = ["system", "light", "dark"];
      const palettes = ${JSON.stringify(palettes)};
      const shapes = ${JSON.stringify(shapes)};
      const normalize = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
      const apply = (mode) => {
        const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const resolved = mode === "dark" || (mode === "system" && systemDark) ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", resolved);
        document.documentElement.setAttribute("data-theme-mode", mode);
        document.documentElement.setAttribute("data-palette", normalize(localStorage.getItem(paletteKey), palettes, "factory"));
      };
      const mode = normalize(localStorage.getItem(modeKey), modes, "system");
      apply(mode);
      const shape = normalize(localStorage.getItem(shapeKey), shapes, "rounded");
      document.documentElement.setAttribute("data-shape", shape);
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        apply(normalize(localStorage.getItem(modeKey), modes, "system"));
      });
    })();
  `;
  return <Script id="carvey-theme-script" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: script }} />;
}
