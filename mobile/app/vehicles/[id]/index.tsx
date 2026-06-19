import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Camera, Car, Edit, Plus } from "lucide-react-native";
import { pickAndSaveVehiclePhoto } from "@/lib/photos";
import {
  deleteMaintenance,
  deleteMot,
  deletePlannedPurchase,
  deleteReminder,
  deleteRepair,
  getVehicle,
  listMaintenance,
  listMots,
  listPlannedPurchases,
  listReminders,
  listRepairs,
  setVehiclePhoto,
  type MaintenanceRecord,
  type MotRecord,
  type PlannedPurchase,
  type Reminder,
  type RepairRecord,
  type Vehicle,
} from "@/lib/db";
import { formatCurrency, formatDate, formatMiles, formatMotResult } from "@/lib/format";

import { getReminderStatus } from "@/lib/reminders";
import { useSettings } from "@/lib/SettingsContext";
import { useTheme } from "@/lib/theme";

type Tab = "maintenance" | "repairs" | "tests" | "reminders" | "purchases";

function testTabLabel(motFeature: string): string {
  if (motFeature === "emissionsTest") return "Emissions Test";
  if (motFeature === "disabled") return "Tests";
  return "MOT";
}

const ADD_PATH: Record<Tab, string> = {
  maintenance: "maintenance/new",
  repairs: "repairs/new",
  tests: "tests/new",
  reminders: "reminders/new",
  purchases: "purchases/new",
};

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicleId = parseInt(id, 10);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [repairs, setRepairs] = useState<RepairRecord[]>([]);
  const [mots, setMots] = useState<MotRecord[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [purchases, setPurchases] = useState<PlannedPurchase[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("maintenance");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { settings } = useSettings();
  const { isDark, accent, bg, cardBg, textPrimary, textSecondary, borderColor } = useTheme();

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: "maintenance", label: "Maintenance" },
    { id: "repairs", label: "Repairs" },
    { id: "tests", label: testTabLabel(settings.motFeature) },
    { id: "reminders", label: "Reminders" },
    { id: "purchases", label: "Purchases" },
  ];

  async function loadData() {
    const [v, m, r, mo, rem, pur] = await Promise.all([
      getVehicle(vehicleId),
      listMaintenance(vehicleId),
      listRepairs(vehicleId),
      listMots(vehicleId),
      listReminders(vehicleId),
      listPlannedPurchases(vehicleId),
    ]);
    setVehicle(v);
    setMaintenance(m);
    setRepairs(r);
    setMots(mo);
    setReminders(rem);
    setPurchases(pur);
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }, [vehicleId])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function handlePhotoPress() {
    Alert.alert("Vehicle Photo", "Choose a source", [
      { text: "Take Photo", onPress: () => doPickPhoto("camera") },
      { text: "Choose from Library", onPress: () => doPickPhoto("library") },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function doPickPhoto(source: "camera" | "library") {
    const result = await pickAndSaveVehiclePhoto(source);
    if (!result) return;
    await setVehiclePhoto(vehicleId, result.original, result.thumbnail);
    setVehicle((prev) =>
      prev ? { ...prev, photoPath: result.original, thumbnailPath: result.thumbnail } : prev
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: bg }}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  if (!vehicle) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: bg }}>
        <Text style={{ color: textSecondary }}>Vehicle not found</Text>
      </View>
    );
  }

  const currentTabData: unknown[] = {
    maintenance,
    repairs,
    tests: mots,
    reminders,
    purchases,
  }[activeTab];

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Vehicle header */}
      <View style={{ backgroundColor: cardBg, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: borderColor }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          {/* Photo slot */}
          <Pressable
            onPress={handlePhotoPress}
            android_ripple={{ color: "rgba(0,0,0,0.1)" }}
            style={{ marginRight: 14 }}
          >
            <View style={{ position: "relative" }}>
              {vehicle.photoPath ? (
                <Image
                  source={{ uri: vehicle.photoPath }}
                  style={{ width: 80, height: 80, borderRadius: 10 }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isDark ? "#374151" : "#f3f4f6",
                  }}
                >
                  <Car size={34} color={textSecondary} />
                </View>
              )}
              <View
                style={{
                  position: "absolute",
                  bottom: -5,
                  right: -5,
                  backgroundColor: accent,
                  borderRadius: 10,
                  padding: 3,
                }}
              >
                <Camera size={11} color="#fff" />
              </View>
            </View>
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: textPrimary }}>
              {vehicle.make} {vehicle.model}
            </Text>
            <Text style={{ fontSize: 15, color: accent, fontWeight: "600", marginTop: 2 }}>
              {vehicle.registration}
            </Text>
            {vehicle.year ? (
              <Text style={{ fontSize: 13, color: textSecondary, marginTop: 1 }}>{vehicle.year}</Text>
            ) : null}
            {vehicle.effectiveOdometer ? (
              <Text style={{ fontSize: 13, color: textSecondary, marginTop: 1 }}>
                {formatMiles(vehicle.effectiveOdometer, settings)}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => router.push(`/vehicles/${vehicleId}/edit`)}
            android_ripple={{ color: "rgba(0,0,0,0.1)" }}
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: isDark ? "#374151" : "#f3f4f6",
            }}
          >
            <Edit size={18} color={textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Tab bar */}
      <View style={{ backgroundColor: cardBg, borderBottomWidth: 1, borderBottomColor: borderColor }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 8 }}
        >
          {TABS.map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderBottomWidth: 2,
                borderBottomColor: activeTab === tab.id ? accent : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: activeTab === tab.id ? accent : textSecondary,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Add button toolbar */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: bg,
        }}
      >
        <Pressable
          onPress={() => router.push(`/vehicles/${vehicleId}/${ADD_PATH[activeTab]}`)}
          android_ripple={{ color: "rgba(255,255,255,0.25)" }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: 8,
            backgroundColor: accent,
          }}
        >
          <Plus size={14} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Add</Text>
        </Pressable>
      </View>

      {/* Record list */}
      <FlatList
        style={{ flex: 1 }}
        data={currentTabData}
        keyExtractor={(item) => String((item as { id: number }).id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 48 }}>
            <Text style={{ color: textSecondary, fontSize: 14 }}>No records yet</Text>
          </View>
        }
        renderItem={({ item }) => {
          const record = item as { id: number };
          function onPress() {
            const basePath = `/vehicles/${vehicleId}`;
            const pathMap: Record<Tab, string> = {
              maintenance: `${basePath}/maintenance/${record.id}/edit`,
              repairs: `${basePath}/repairs/${record.id}/edit`,
              tests: `${basePath}/tests/${record.id}/edit`,
              reminders: `${basePath}/reminders/${record.id}/edit`,
              purchases: `${basePath}/purchases/${record.id}/edit`,
            };
            router.push(pathMap[activeTab]);
          }
          function onLongPress() {
            Alert.alert("Delete record", "Are you sure you want to delete this record?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  if (activeTab === "maintenance") await deleteMaintenance(record.id, vehicleId);
                  else if (activeTab === "repairs") await deleteRepair(record.id, vehicleId);
                  else if (activeTab === "tests") await deleteMot(record.id, vehicleId);
                  else if (activeTab === "reminders") await deleteReminder(record.id, vehicleId);
                  else if (activeTab === "purchases") await deletePlannedPurchase(record.id, vehicleId);
                  await loadData();
                },
              },
            ]);
          }
          return (
            <View style={{ paddingHorizontal: 12, marginBottom: 8 }}>
              <Pressable onPress={onPress} onLongPress={onLongPress} android_ripple={{ color: "rgba(0,0,0,0.06)" }}>
                <RecordRow
                  tab={activeTab}
                  item={item}
                  vehicle={vehicle}
                  isDark={isDark}
                  cardBg={cardBg}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  borderColor={borderColor}
                  settings={settings}
                />
              </Pressable>
            </View>
          );
        }}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 24 }}
      />
    </View>
  );
}

function RecordRow({
  tab,
  item,
  vehicle,
  isDark,
  cardBg,
  textPrimary,
  textSecondary,
  borderColor,
  settings,
}: {
  tab: Tab;
  item: unknown;
  vehicle: Vehicle;
  isDark: boolean;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  settings: { currency?: "GBP" | "USD" | "EUR"; distanceUnit?: "miles" | "km"; dateFormat?: "dd-mon-yyyy" | "iso" };
}) {
  const rowStyle = {
    backgroundColor: cardBg,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor,
  };

  if (tab === "maintenance") {
    const r = item as MaintenanceRecord;
    return (
      <View style={rowStyle}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: textPrimary, flex: 1 }} numberOfLines={1}>
            {r.description}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: "600", color: textPrimary, marginLeft: 8 }}>
            {formatCurrency(r.cost, settings)}
          </Text>
        </View>
        <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
          {r.category} · {formatDate(r.date, settings)}
          {r.odometer ? ` · ${formatMiles(r.odometer, settings)}` : ""}
        </Text>
      </View>
    );
  }

  if (tab === "repairs") {
    const r = item as RepairRecord;
    return (
      <View style={rowStyle}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: textPrimary, flex: 1 }} numberOfLines={1}>
            {r.fault}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: "600", color: textPrimary, marginLeft: 8 }}>
            {formatCurrency(r.cost, settings)}
          </Text>
        </View>
        <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
          {r.garage ?? "Unknown garage"} · {formatDate(r.date, settings)}
        </Text>
      </View>
    );
  }

  if (tab === "tests") {
    const r = item as MotRecord;
    const resultColor = r.result === "pass" ? "#16a34a" : r.result === "advisory" ? "#d97706" : "#dc2626";
    return (
      <View style={rowStyle}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: textPrimary }}>
              {formatDate(r.testDate, settings)}
            </Text>
            <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
              Expires {formatDate(r.expiryDate, settings)}
              {r.odometer ? ` · ${formatMiles(r.odometer, settings)}` : ""}
            </Text>
          </View>
          <View style={{ backgroundColor: resultColor + "20", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: resultColor }}>
              {formatMotResult(r.result)}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (tab === "reminders") {
    const r = item as Reminder;
    const status = getReminderStatus(r, vehicle);
    const statusColor = {
      done: "#16a34a",
      overdue: "#dc2626",
      upcoming: "#d97706",
      open: "#6b7280",
    }[status];
    return (
      <View style={rowStyle}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: textPrimary, flex: 1 }} numberOfLines={1}>
            {r.title}
          </Text>
          <View style={{ backgroundColor: statusColor + "20", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: statusColor, textTransform: "capitalize" }}>
              {status}
            </Text>
          </View>
        </View>
        {r.dueDate ? (
          <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
            Due {formatDate(r.dueDate, settings)}
          </Text>
        ) : null}
      </View>
    );
  }

  if (tab === "purchases") {
    const r = item as PlannedPurchase;
    const bought = !!r.purchasedDate;
    return (
      <View style={[rowStyle, bought ? { opacity: 0.75 } : {}]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: textPrimary,
              flex: 1,
              textDecorationLine: bought ? "line-through" : "none",
            }}
            numberOfLines={1}
          >
            {r.itemName}
          </Text>
          {bought ? (
            <View style={{ backgroundColor: "#16a34a20", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginLeft: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#16a34a" }}>Bought</Text>
            </View>
          ) : (
            <Text style={{ fontSize: 14, fontWeight: "600", color: textPrimary, marginLeft: 8 }}>
              {formatCurrency(r.estimatedCost, settings)}
            </Text>
          )}
        </View>
        {r.supplier && !bought ? (
          <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>{r.supplier}</Text>
        ) : null}
        {bought && r.purchasedDate ? (
          <Text style={{ fontSize: 12, color: "#16a34a", marginTop: 2 }}>
            Purchased {formatDate(r.purchasedDate, settings)}
          </Text>
        ) : null}
      </View>
    );
  }

  return null;
}
