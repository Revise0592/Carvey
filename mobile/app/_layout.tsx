import "../global.css";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as LocalAuthentication from "expo-local-authentication";
import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Pressable, Text, View } from "react-native";
import { Lock } from "lucide-react-native";
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
  const { isDark, accent } = useTheme();
  const { settings, loaded } = useSettings();
  const [locked, setLocked] = useState(false);
  const authInProgress = useRef(false);
  const wentToBackground = useRef(false);

  const isSecurityEnabled = settings.securityEnabled === "true";

  const addTestTitle =
    settings.motFeature === "emissionsTest"
      ? "Add Emissions Test"
      : settings.motFeature === "disabled"
      ? "Add Test"
      : "Add MOT";

  const editTestTitle =
    settings.motFeature === "emissionsTest"
      ? "Edit Emissions Test"
      : settings.motFeature === "disabled"
      ? "Edit Test"
      : "Edit MOT";

  const headerBg = isDark ? "#111827" : "#ffffff";
  const headerTint = isDark ? "#f9fafb" : "#111827";
  const contentBg = isDark ? "#111827" : "#f9fafb";

  async function authenticate() {
    if (authInProgress.current) return;
    authInProgress.current = true;
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        setLocked(false);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Carvey",
        disableDeviceFallback: false,
        cancelLabel: "Cancel",
      });
      if (result.success) setLocked(false);
    } finally {
      authInProgress.current = false;
    }
  }

  // Lock on startup if security is enabled
  useEffect(() => {
    if (!loaded) return;
    if (isSecurityEnabled) {
      setLocked(true);
      authenticate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // Lock when app returns from background
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        if (isSecurityEnabled) wentToBackground.current = true;
      } else if (nextState === "active" && wentToBackground.current) {
        wentToBackground.current = false;
        if (isSecurityEnabled) {
          setLocked(true);
          authenticate();
        }
      }
    };
    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [isSecurityEnabled]);

  const lockBg = isDark ? "#111827" : "#f9fafb";
  const lockText = isDark ? "#f9fafb" : "#111827";

  if (locked) {
    return (
      <View style={{ flex: 1, backgroundColor: lockBg, alignItems: "center", justifyContent: "center" }}>
        <Lock size={52} color={accent} />
        <Text style={{ color: lockText, fontSize: 20, fontWeight: "700", marginTop: 20 }}>
          Carvey is locked
        </Text>
        <Text style={{ color: isDark ? "#6b7280" : "#9ca3af", fontSize: 14, marginTop: 6 }}>
          Authenticate to continue
        </Text>
        <Pressable
          onPress={authenticate}
          android_ripple={{ color: "rgba(255,255,255,0.25)" }}
          style={{
            marginTop: 28,
            paddingHorizontal: 32,
            paddingVertical: 13,
            borderRadius: 12,
            backgroundColor: accent,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>Unlock</Text>
        </Pressable>
      </View>
    );
  }

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
      <Stack.Screen name="vehicles/[id]/maintenance/[rid]/edit" options={{ title: "Edit Maintenance", presentation: "modal" }} />
      <Stack.Screen name="vehicles/[id]/repairs/[rid]/edit" options={{ title: "Edit Repair", presentation: "modal" }} />
      <Stack.Screen name="vehicles/[id]/tests/[rid]/edit" options={{ title: editTestTitle, presentation: "modal" }} />
      <Stack.Screen name="vehicles/[id]/reminders/[rid]/edit" options={{ title: "Edit Reminder", presentation: "modal" }} />
      <Stack.Screen name="vehicles/[id]/purchases/[rid]/edit" options={{ title: "Edit Purchase", presentation: "modal" }} />
      <Stack.Screen name="workshops" options={{ title: "Workshops" }} />
      <Stack.Screen name="workshops/new" options={{ title: "Add Workshop", presentation: "modal" }} />
      <Stack.Screen name="workshops/[wid]/edit" options={{ title: "Edit Workshop", presentation: "modal" }} />
      <Stack.Screen name="categories" options={{ title: "Maintenance Categories" }} />
    </Stack>
  );
}
