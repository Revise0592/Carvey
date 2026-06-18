import { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { listMaintenanceCategories, type MaintenanceCategory } from "@/lib/db";

type Props = {
  category: string;
  onSelect: (name: string) => void;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  cardBg: string;
  bg: string;
  accent: string;
};

export function CategoryPicker({
  category,
  onSelect,
  textPrimary,
  textSecondary,
  borderColor,
  cardBg,
  bg,
  accent,
}: Props) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<MaintenanceCategory[]>([]);

  useEffect(() => {
    listMaintenanceCategories().then(setCategories);
  }, []);

  if (categories.length === 0) return null;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        android_ripple={{ color: "rgba(0,0,0,0.06)" }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 8,
        }}
      >
        <Text style={{ fontSize: 13, color: textSecondary }}>
          {category ? `Category: ${category}` : "Select from saved categories"}
        </Text>
        <ChevronRight size={16} color={accent} />
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: bg }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: borderColor,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "600", color: textPrimary }}>
              Select Category
            </Text>
            <Pressable onPress={() => setOpen(false)}>
              <Text style={{ color: accent, fontSize: 16 }}>Cancel</Text>
            </Pressable>
          </View>

          <FlatList
            data={categories}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item.name);
                  setOpen(false);
                }}
                android_ripple={{ color: "rgba(0,0,0,0.06)" }}
                style={{
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: borderColor,
                  backgroundColor: cardBg,
                }}
              >
                <Text style={{ fontSize: 15, color: textPrimary }}>{item.name}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </>
  );
}
