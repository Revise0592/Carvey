import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Plus } from "lucide-react-native";
import { deleteWorkshop, listWorkshops, type Workshop } from "@/lib/db";
import { useTheme } from "@/lib/theme";

export default function WorkshopsScreen() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const { accent, bg, cardBg, textPrimary, textSecondary, borderColor } = useTheme();

  async function loadData() {
    setWorkshops(await listWorkshops());
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

  function handleDelete(workshop: Workshop) {
    Alert.alert("Delete workshop", `Delete "${workshop.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteWorkshop(workshop.id);
          await loadData();
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 12, paddingVertical: 8 }}>
        <Pressable
          onPress={() => router.push("/workshops/new")}
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

      <FlatList
        data={workshops}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 48 }}>
            <Text style={{ color: textSecondary, fontSize: 14 }}>No workshops yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 12, marginBottom: 8 }}>
            <Pressable
              onPress={() => router.push(`/workshops/${item.id}/edit`)}
              onLongPress={() => handleDelete(item)}
              android_ripple={{ color: "rgba(0,0,0,0.06)" }}
              style={{
                backgroundColor: cardBg,
                borderRadius: 10,
                padding: 14,
                borderWidth: 1,
                borderColor,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: textPrimary }}>{item.name}</Text>
                    {item.preferred ? (
                      <View style={{ backgroundColor: accent + "20", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: "600", color: accent }}>Preferred</Text>
                      </View>
                    ) : null}
                  </View>
                  {item.phone ? (
                    <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>{item.phone}</Text>
                  ) : null}
                  {item.address ? (
                    <Text style={{ fontSize: 12, color: textSecondary, marginTop: 1 }} numberOfLines={1}>{item.address}</Text>
                  ) : null}
                </View>
                <Text style={{ fontSize: 18, color: textSecondary, marginLeft: 8 }}>›</Text>
              </View>
            </Pressable>
          </View>
        )}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 24 }}
      />
    </View>
  );
}
