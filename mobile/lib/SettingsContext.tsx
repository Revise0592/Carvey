import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getAppSetting, setAppSetting } from "./db";

export type RegionalSettings = {
  currency: "GBP" | "USD" | "EUR";
  motFeature: "mot" | "emissionsTest" | "disabled";
  dateFormat: "dd-mon-yyyy" | "iso";
  distanceUnit: "miles" | "km";
  plateStyle: "uk-yellow" | "uk-white";
};

export type ThemePalette =
  | "default"
  | "british-racing"
  | "midnight-alloy"
  | "tan-leather"
  | "signal-red"
  | "petrol-blue"
  | "heritage-cream"
  | "sunflower-yellow"
  | "slate-blue"
  | "forest-green";

export type AppSettings = RegionalSettings & {
  palette: ThemePalette;
  darkMode: "system" | "light" | "dark";
  collectionName: string;
  securityEnabled: "true" | "false";
};

const defaults: AppSettings = {
  currency: "GBP",
  motFeature: "mot",
  dateFormat: "dd-mon-yyyy",
  distanceUnit: "miles",
  plateStyle: "uk-yellow",
  palette: "default",
  darkMode: "system",
  collectionName: "My cars",
  securityEnabled: "false",
};

type SettingsContextValue = {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  loaded: boolean;
};

const SettingsContext = createContext<SettingsContextValue>({
  settings: defaults,
  updateSetting: async () => {},
  loaded: false,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaults);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const keys = Object.keys(defaults) as Array<keyof AppSettings>;
      const entries = await Promise.all(
        keys.map(async (k) => [k, await getAppSetting(k)] as const)
      );
      const loaded: Partial<AppSettings> = {};
      for (const [key, value] of entries) {
        if (value !== null) {
          (loaded as Record<string, unknown>)[key] = value;
        }
      }
      setSettings({ ...defaults, ...loaded });
      setLoaded(true);
    }
    load();
  }, []);

  const updateSetting = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      await setAppSetting(key, String(value));
    },
    []
  );

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, loaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

export const paletteAccentColors: Record<ThemePalette, string> = {
  default: "#1a56db",
  "british-racing": "#0f3d2e",
  "midnight-alloy": "#5f6875",
  "tan-leather": "#a15c2f",
  "signal-red": "#b42318",
  "petrol-blue": "#126b8f",
  "heritage-cream": "#8c6d3f",
  "sunflower-yellow": "#b45309",
  "slate-blue": "#4338ca",
  "forest-green": "#166534",
};
