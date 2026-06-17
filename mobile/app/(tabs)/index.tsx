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
import {
  getActivePurchaseCount,
  getOpenReminderCount,
  getYearlySpend,
  listVehicles,
  type Vehicle,
} from "@/lib/db";
import { formatCurrency, formatMiles } from "@/lib/format";
import { useSettings } from "@/lib/SettingsContext";
import { useTheme } from "@/lib/theme";

export default function GarageScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [yearlySpend, setYearlySpend] = useState(0);
  const [openReminders, setOpenReminders] = useState(0);
  const [activePurchases, setActivePurchases] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { settings } = useSettings();
  const { isDark, accent, bg, cardBg, textPrimary, textSecondary } = useTheme();

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
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: bg }}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: bg }}
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
              cardBg={cardBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
            <StatCard
              label="Reminders"
              value={String(openReminders)}
              cardBg={cardBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              highlight={openReminders > 0}
              accent={accent}
            />
            <StatCard
              label="To buy"
              value={String(activePurchases)}
              cardBg={cardBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
          </View>

          {/* Section header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: textPrimary }}>
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
          <Text style={{ marginTop: 16, fontSize: 15, fontWeight: "500", color: textSecondary }}>
            No vehicles yet
          </Text>
          <Text style={{ marginTop: 4, fontSize: 13, textAlign: "center", color: isDark ? "#6b7280" : "#9ca3af" }}>
            Tap "Add" to add your first vehicle
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <VehicleCard vehicle={item} isDark={isDark} cardBg={cardBg} textPrimary={textPrimary} textSecondary={textSecondary} settings={settings} />
        </View>
      )}
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}

function StatCard({
  label,
  value,
  cardBg,
  textPrimary,
  textSecondary,
  highlight,
  accent,
}: {
  label: string;
  value: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  highlight?: boolean;
  accent?: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 12,
        padding: 12,
        backgroundColor: cardBg,
        ...(highlight && accent ? { borderWidth: 1, borderColor: accent } : {}),
      }}
    >
      <Text
        style={{
          fontSize: 17,
          fontWeight: "700",
          color: highlight && accent ? accent : textPrimary,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={{ fontSize: 11, marginTop: 2, color: textSecondary }}>{label}</Text>
    </View>
  );
}

function VehicleCard({
  vehicle,
  isDark,
  cardBg,
  textPrimary,
  textSecondary,
  settings,
}: {
  vehicle: Vehicle;
  isDark: boolean;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
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
          backgroundColor: cardBg,
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
            <Car size={20} color={textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: textPrimary }} numberOfLines={1}>
              {vehicle.make} {vehicle.model}
            </Text>
            <Text style={{ fontSize: 13, color: textSecondary }} numberOfLines={1}>
              {vehicle.registration}
              {vehicle.year ? ` · ${vehicle.year}` : ""}
              {vehicle.effectiveOdometer
                ? ` · ${formatMiles(vehicle.effectiveOdometer, settings)}`
                : ""}
            </Text>
          </View>
        </View>
        <ChevronRight size={18} color={textSecondary} />
      </Pressable>
    </Link>
  );
}
