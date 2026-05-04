import { brandIconPaths } from "@/lib/theme-branding";
import { themePalettes } from "@/lib/theme-options";

export function ThemeScript() {
  const palettes = themePalettes.map((palette) => palette.id);
  const icons = {
    light: brandIconPaths.light.png,
    dark: brandIconPaths.dark.png
  };
  const script = `
    (() => {
      const modeKey = "carvey-theme";
      const paletteKey = "carvey-palette";
      const modes = ["system", "light", "dark"];
      const palettes = ${JSON.stringify(palettes)};
      const icons = ${JSON.stringify(icons)};
      const normalize = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
      const updateFaviconLinks = (resolved) => {
        const href = icons[resolved];
        document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach((link) => {
          link.href = href;
        });
      };
      const apply = (mode) => {
        const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const resolved = mode === "dark" || (mode === "system" && systemDark) ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", resolved);
        document.documentElement.setAttribute("data-theme-mode", mode);
        document.documentElement.setAttribute("data-palette", normalize(localStorage.getItem(paletteKey), palettes, "factory"));
        updateFaviconLinks(resolved);
      };
      const mode = normalize(localStorage.getItem(modeKey), modes, "system");
      apply(mode);
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        apply(normalize(localStorage.getItem(modeKey), modes, "system"));
      });
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
