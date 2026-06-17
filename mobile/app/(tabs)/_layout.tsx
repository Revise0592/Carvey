import { Tabs } from "expo-router";
import { Car, Settings } from "lucide-react-native";
import { useSettings } from "@/lib/SettingsContext";
import { useTheme } from "@/lib/theme";

export default function TabLayout() {
  const { settings } = useSettings();
  const { isDark, accent: accentColor } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: accentColor,
        tabBarInactiveTintColor: isDark ? "#6b7280" : "#9ca3af",
        tabBarStyle: {
          backgroundColor: isDark ? "#1f2937" : "#ffffff",
          borderTopColor: isDark ? "#374151" : "#e5e7eb",
        },
        headerStyle: { backgroundColor: isDark ? "#111827" : "#ffffff" },
        headerTintColor: isDark ? "#f9fafb" : "#111827",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: settings.collectionName,
          tabBarLabel: "Garage",
          tabBarIcon: ({ color, size }) => <Car size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarLabel: "Settings",
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
