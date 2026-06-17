import "../global.css";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { SettingsProvider, useSettings } from "@/lib/SettingsContext";
import { useTheme } from "@/lib/theme";
import { getDb } from "@/lib/db";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    getDb()
      .then(() => setDbReady(true))
      .catch((err) => {
        console.error("DB init failed:", err);
        setDbReady(true);
      });
  }, []);

  useEffect(() => {
    if (dbReady) {
      SplashScreen.hideAsync();
    }
  }, [dbReady]);

  if (!dbReady) return null;

  return (
    <SettingsProvider>
      <RootLayoutNav />
    </SettingsProvider>
  );
}

function RootLayoutNav() {
  const { isDark } = useTheme();
  const { settings } = useSettings();
  const addTestTitle =
    settings.motFeature === "emissionsTest"
      ? "Add Emissions Test"
      : settings.motFeature === "disabled"
      ? "Add Test"
      : "Add MOT";

  const headerBg = isDark ? "#111827" : "#ffffff";
  const headerTint = isDark ? "#f9fafb" : "#111827";
  const contentBg = isDark ? "#111827" : "#f9fafb";

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: headerBg },
        headerTintColor: headerTint,
        contentStyle: { backgroundColor: contentBg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      <Stack.Screen name="vehicles/new" options={{ title: "Add Vehicle", presentation: "modal" }} />
      <Stack.Screen name="vehicles/[id]/index" options={{ title: "Vehicle" }} />
      <Stack.Screen name="vehicles/[id]/edit" options={{ title: "Edit Vehicle", presentation: "modal" }} />
      <Stack.Screen name="vehicles/[id]/maintenance/new" options={{ title: "Add Maintenance", presentation: "modal" }} />
      <Stack.Screen name="vehicles/[id]/repairs/new" options={{ title: "Add Repair", presentation: "modal" }} />
      <Stack.Screen name="vehicles/[id]/tests/new" options={{ title: addTestTitle, presentation: "modal" }} />
      <Stack.Screen name="vehicles/[id]/reminders/new" options={{ title: "Add Reminder", presentation: "modal" }} />
      <Stack.Screen name="vehicles/[id]/purchases/new" options={{ title: "Add Purchase", presentation: "modal" }} />
    </Stack>
  );
}
