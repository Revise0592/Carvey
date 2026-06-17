import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { Car, ChevronRight, Plus } from "lucide-react-native";
import { useColorScheme } from "react-native";
import {
  getActivePurchaseCount,
  getOpenReminderCount,
  getYearlySpend,
  listVehicles,
  type Vehicle,
} from "@/lib/db";
import { formatCurrency, formatMiles } from "@/lib/format";
import { useSettings, paletteAccentColors } from "@/lib/SettingsContext";

export default function GarageScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [yearlySpend, setYearlySpend] = useState(0);
  const [openReminders, setOpenReminders] = useState(0);
  const [activePurchases, setActivePurchases] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { settings } = useSettings();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const accent = paletteAccentColors[settings.palette];

  async function loadData() {
    const [vs, spend, reminders, purchases] = await Promise.all([
      listVehicles(),
      getYearlySpend(),
      getOpenReminderCount(),
      getActivePurchaseCount(),
    ]);
    setVehicles(vs);
    setYearlySpend(spend);
    setOpenReminders(reminders);
    setActivePurchases(purchases);
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: isDark ? "#111827" : "#f9fafb" }}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: isDark ? "#111827" : "#f9fafb" }}
      data={vehicles}
      keyExtractor={(item) => String(item.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
          {/* Stats row */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
            <StatCard
              label={`${new Date().getFullYear()} spend`}
              value={formatCurrency(yearlySpend, { currency: settings.currency })}
              isDark={isDark}
            />
            <StatCard
              label="Reminders"
              value={String(openReminders)}
              isDark={isDark}
              highlight={openReminders > 0}
              accent={accent}
            />
            <StatCard
              label="To buy"
              value={String(activePurchases)}
              isDark={isDark}
            />
          </View>

          {/* Section header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: isDark ? "#f3f4f6" : "#111827" }}>
              Vehicles
            </Text>
            <Link href="/vehicles/new" asChild>
              <Pressable
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: accent,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Plus size={14} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "500" }}>Add</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 64, paddingHorizontal: 32 }}>
          <Car size={48} color={isDark ? "#4b5563" : "#d1d5db"} />
          <Text style={{ marginTop: 16, fontSize: 15, fontWeight: "500", color: isDark ? "#9ca3af" : "#6b7280" }}>
            No vehicles yet
          </Text>
          <Text style={{ marginTop: 4, fontSize: 13, textAlign: "center", color: isDark ? "#6b7280" : "#9ca3af" }}>
            Tap &quot;Add&quot; to add your first vehicle
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <VehicleCard vehicle={item} isDark={isDark} settings={settings} />
        </View>
      )}
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}

function StatCard({
  label,
  value,
  isDark,
  highlight,
  accent,
}: {
  label: string;
  value: string;
  isDark: boolean;
  highlight?: boolean;
  accent?: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 12,
        padding: 12,
        backgroundColor: isDark ? "#1f2937" : "#ffffff",
        ...(highlight && accent ? { borderWidth: 1, borderColor: accent } : {}),
      }}
    >
      <Text
        style={{
          fontSize: 17,
          fontWeight: "700",
          color: highlight && accent ? accent : isDark ? "#f3f4f6" : "#111827",
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={{ fontSize: 11, marginTop: 2, color: isDark ? "#9ca3af" : "#6b7280" }}>
        {label}
      </Text>
    </View>
  );
}

function VehicleCard({
  vehicle,
  isDark,
  settings,
}: {
  vehicle: Vehicle;
  isDark: boolean;
  settings: { distanceUnit?: "miles" | "km" };
}) {
  return (
    <Link href={`/vehicles/${vehicle.id}`} asChild>
      <Pressable
        style={({ pressed }) => ({
          borderRadius: 12,
          padding: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: isDark ? "#1f2937" : "#ffffff",
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? "#374151" : "#f3f4f6",
            }}
          >
            <Car size={20} color={isDark ? "#9ca3af" : "#6b7280"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 15, fontWeight: "600", color: isDark ? "#f3f4f6" : "#111827" }}
              numberOfLines={1}
            >
              {vehicle.make} {vehicle.model}
            </Text>
            <Text style={{ fontSize: 13, color: isDark ? "#9ca3af" : "#6b7280" }} numberOfLines={1}>
              {vehicle.registration}
              {vehicle.year ? ` · ${vehicle.year}` : ""}
              {vehicle.effectiveOdometer
                ? ` · ${formatMiles(vehicle.effectiveOdometer, settings)}`
                : ""}
            </Text>
          </View>
        </View>
        <ChevronRight size={18} color={isDark ? "#6b7280" : "#9ca3af"} />
      </Pressable>
    </Link>
  );
}
