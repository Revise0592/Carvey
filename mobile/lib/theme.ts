import { useColorScheme } from "react-native";
import { useSettings, paletteAccentColors } from "./SettingsContext";

export function useTheme() {
  const systemScheme = useColorScheme();
  const { settings } = useSettings();

  const isDark =
    settings.darkMode === "dark"
      ? true
      : settings.darkMode === "light"
      ? false
      : systemScheme === "dark";

  const accent = paletteAccentColors[settings.palette];

  return {
    isDark,
    accent,
    bg: isDark ? "#111827" : "#f9fafb",
    cardBg: isDark ? "#1f2937" : "#ffffff",
    textPrimary: isDark ? "#f3f4f6" : "#111827",
    textSecondary: isDark ? "#9ca3af" : "#6b7280",
    borderColor: isDark ? "#374151" : "#e5e7eb",
    inputBg: isDark ? "#111827" : "#f9fafb",
  };
}
