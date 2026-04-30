"use client";

import { Monitor, Moon, Sun } from "lucide-react";

type ThemeMode = "system" | "light" | "dark";

const options: Array<{ mode: ThemeMode; label: string; icon: React.ReactNode }> = [
  { mode: "system", label: "System", icon: <Monitor size={17} /> },
  { mode: "light", label: "Light", icon: <Sun size={17} /> },
  { mode: "dark", label: "Dark", icon: <Moon size={17} /> }
];

export function ThemeControls() {
  function applyTheme(nextMode: ThemeMode) {
    window.localStorage.setItem("carvey-theme", nextMode);
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = nextMode === "dark" || (nextMode === "system" && systemDark) ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.setAttribute("data-theme-mode", nextMode);
  }

  return (
    <div className="segmented-control" role="group" aria-label="Theme">
      {options.map((option) => (
        <button
          className={`theme-option theme-${option.mode}`}
          key={option.mode}
          type="button"
          onClick={() => applyTheme(option.mode)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
