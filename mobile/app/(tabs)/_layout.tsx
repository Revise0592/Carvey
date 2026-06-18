import { Image } from "react-native";
import { Tabs } from "expo-router";
import { Car, Settings } from "lucide-react-native";
import { useSettings } from "@/lib/SettingsContext";
import { useTheme } from "@/lib/theme";

const logoLight = require("../../assets/images/Carvey-light.png");
const logoDark = require("../../assets/images/Carvey-dark.png");

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
          tabBarLabel: "Garage",
          tabBarIcon: ({ color, size }) => <Car size={size} color={color} />,
          headerTitle: () => (
            <Image
              source={isDark ? logoDark : logoLight}
              style={{ height: 28, width: 110 }}
              resizeMode="contain"
            />
          ),
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
