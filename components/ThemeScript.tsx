export function ThemeScript() {
  const script = `
    (() => {
      const key = "carvey-theme";
      const apply = (mode) => {
        const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const resolved = mode === "dark" || (mode === "system" && systemDark) ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", resolved);
        document.documentElement.setAttribute("data-theme-mode", mode);
      };
      const mode = localStorage.getItem(key) || "system";
      apply(mode);
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        apply(localStorage.getItem(key) || "system");
      });
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
