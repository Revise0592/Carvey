"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { resolveThemeMode } from "@/lib/theme-branding";
import { themePalettes, themeShapes, type ThemeMode, type ThemePalette, type ThemeShape } from "@/lib/theme-options";

const modeOptions: Array<{ mode: ThemeMode; label: string; icon: React.ReactNode }> = [
  { mode: "system", label: "System", icon: <Monitor size={17} /> },
  { mode: "light", label: "Light", icon: <Sun size={17} /> },
  { mode: "dark", label: "Dark", icon: <Moon size={17} /> }
];

const shapeOptions: Array<{ shape: ThemeShape; label: string }> = [
  { shape: "rounded", label: "Rounded" },
  { shape: "boxy", label: "Boxy" }
];

export function ThemeControls() {
  function applyTheme(nextMode: ThemeMode) {
    window.localStorage.setItem("carvey-theme", nextMode);
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = resolveThemeMode(nextMode, systemDark);
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.setAttribute("data-theme-mode", nextMode);
  }

  function applyPalette(nextPalette: ThemePalette) {
    window.localStorage.setItem("carvey-palette", nextPalette);
    document.documentElement.setAttribute("data-palette", nextPalette);
  }

  function applyShape(nextShape: ThemeShape) {
    window.localStorage.setItem("carvey-shape", nextShape);
    document.documentElement.setAttribute("data-shape", nextShape);
  }

  return (
    <div className="appearance-controls">
      <div className="appearance-group">
        <span className="appearance-label">Mode</span>
        <div className="segmented-control" role="group" aria-label="Mode">
          {modeOptions.map((option) => (
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
      </div>

      <div className="appearance-group">
        <span className="appearance-label">Theme</span>
        <div className="palette-grid" role="group" aria-label="Theme palette">
          {themePalettes.map((palette) => (
            <button
              className={`palette-option palette-${palette.id}`}
              key={palette.id}
              type="button"
              onClick={() => applyPalette(palette.id)}
            >
              <span className="palette-swatches" aria-hidden="true">
                {palette.swatches.map((swatch) => (
                  <span key={swatch} style={{ background: swatch }} />
                ))}
              </span>
              <span>{palette.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="appearance-group">
        <span className="appearance-label">Style</span>
        <div className="segmented-control segmented-control--2" role="group" aria-label="Shape style">
          {shapeOptions.map((option) => (
            <button
              className={`shape-option shape-${option.shape}`}
              key={option.shape}
              type="button"
              onClick={() => applyShape(option.shape)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
