import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { listAllOpenReminders, type ReminderWithVehicle } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getReminderStatus } from "@/lib/reminders";
import { useSettings } from "@/lib/SettingsContext";
import { useTheme } from "@/lib/theme";

export default function RemindersOverviewScreen() {
  const [reminders, setReminders] = useState<ReminderWithVehicle[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const { settings } = useSettings();
  const { accent, bg, cardBg, textPrimary, textSecondary, borderColor } = useTheme();

  async function loadData() {
    setReminders(await listAllOpenReminders());
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: bg }}
      data={reminders}
      keyExtractor={(item) => String(item.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <View style={{ alignItems: "center", paddingVertical: 64 }}>
          <Text style={{ color: textSecondary, fontSize: 14 }}>No open reminders</Text>
        </View>
      }
      renderItem={({ item }) => {
        const statusColor = {
          done: "#16a34a",
          overdue: "#dc2626",
          upcoming: "#d97706",
          open: "#6b7280",
        }[getReminderStatus(item, { effectiveOdometer: null })];

        return (
          <View style={{ paddingHorizontal: 12, marginBottom: 8, marginTop: item === reminders[0] ? 12 : 0 }}>
            <Pressable
              onPress={() => router.push(`/vehicles/${item.vehicleId}/reminders/${item.id}/edit`)}
              android_ripple={{ color: "rgba(0,0,0,0.06)" }}
              style={{
                backgroundColor: cardBg,
                borderRadius: 10,
                padding: 14,
                borderWidth: 1,
                borderColor,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: textPrimary }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: accent, marginTop: 2, fontWeight: "500" }}>
                    {item.vehicleMake} {item.vehicleModel} · {item.vehicleRegistration}
                  </Text>
                  {item.dueDate ? (
                    <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                      Due {formatDate(item.dueDate, settings)}
                    </Text>
                  ) : item.dueOdometer ? (
                    <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                      Due at {item.dueOdometer.toLocaleString()} {settings.distanceUnit ?? "miles"}
                    </Text>
                  ) : null}
                </View>
                <View
                  style={{
                    backgroundColor: statusColor + "20",
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: statusColor,
                      textTransform: "capitalize",
                    }}
                  >
                    {getReminderStatus(item, { effectiveOdometer: null })}
                  </Text>
                </View>
              </View>
            </Pressable>
          </View>
        );
      }}
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}
