import "../global.css";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { SettingsProvider } from "@/lib/SettingsContext";
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
  const colorScheme = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colorScheme === "dark" ? "#111827" : "#ffffff" },
        headerTintColor: colorScheme === "dark" ? "#f9fafb" : "#111827",
        contentStyle: { backgroundColor: colorScheme === "dark" ? "#111827" : "#f9fafb" },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      <Stack.Screen
        name="vehicles/new"
        options={{ title: "Add Vehicle", presentation: "modal" }}
      />
      <Stack.Screen name="vehicles/[id]/index" options={{ title: "Vehicle" }} />
      <Stack.Screen
        name="vehicles/[id]/edit"
        options={{ title: "Edit Vehicle", presentation: "modal" }}
      />
    </Stack>
  );
}
