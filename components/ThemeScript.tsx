import Script from "next/script";
import { themePalettes } from "@/lib/theme-options";

export function ThemeScript() {
  const palettes = themePalettes.map((palette) => palette.id);
  const script = `
    (() => {
      const modeKey = "carvey-theme";
      const paletteKey = "carvey-palette";
      const modes = ["system", "light", "dark"];
      const palettes = ${JSON.stringify(palettes)};
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
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        apply(normalize(localStorage.getItem(modeKey), modes, "system"));
      });
    })();
  `;
  return <Script id="carvey-theme-script" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: script }} />;
}
