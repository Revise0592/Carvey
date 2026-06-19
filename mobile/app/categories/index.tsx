import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Plus, Trash2 } from "lucide-react-native";
import {
  createMaintenanceCategory,
  deleteMaintenanceCategory,
  listMaintenanceCategories,
  type MaintenanceCategory,
} from "@/lib/db";
import { useTheme } from "@/lib/theme";

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<MaintenanceCategory[]>([]);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { accent, bg, cardBg, textPrimary, textSecondary, borderColor, inputBg } = useTheme();

  async function loadData() {
    setCategories(await listMaintenanceCategories());
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

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await createMaintenanceCategory(newName.trim());
      setNewName("");
      await loadData();
    } catch {
      Alert.alert("Error", "Could not add category. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  function handleDelete(category: MaintenanceCategory) {
    Alert.alert("Delete category", `Delete "${category.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteMaintenanceCategory(category.id);
          await loadData();
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            backgroundColor: cardBg,
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor,
          }}
        >
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="New category name"
            placeholderTextColor={textSecondary}
            style={{
              flex: 1,
              fontSize: 15,
              color: textPrimary,
              backgroundColor: inputBg,
              borderWidth: 1,
              borderColor,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />
          <Pressable
            onPress={handleAdd}
            disabled={adding || !newName.trim()}
            android_ripple={{ color: "rgba(255,255,255,0.25)" }}
            style={{
              paddingHorizontal: 16,
              borderRadius: 8,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: accent,
              opacity: adding || !newName.trim() ? 0.5 : 1,
            }}
          >
            <Plus size={20} color="#fff" />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 48 }}>
            <Text style={{ color: textSecondary, fontSize: 14 }}>No categories yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
            <View
              style={{
                backgroundColor: cardBg,
                borderRadius: 10,
                padding: 14,
                borderWidth: 1,
                borderColor,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 14, color: textPrimary, flex: 1 }}>{item.name}</Text>
              <Pressable
                onPress={() => handleDelete(item)}
                android_ripple={{ color: "rgba(220,38,38,0.15)", borderless: true }}
                style={{ padding: 6 }}
              >
                <Trash2 size={18} color="#dc2626" />
              </Pressable>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 24 }}
      />
    </View>
  );
}
