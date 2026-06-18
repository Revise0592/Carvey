import { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { listWorkshops, type Workshop } from "@/lib/db";

type Props = {
  workshopId: number | null;
  garageName: string;
  onSelect: (workshopId: number | null, name: string) => void;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  cardBg: string;
  bg: string;
  accent: string;
};

export function WorkshopPicker({
  workshopId,
  garageName,
  onSelect,
  textPrimary,
  textSecondary,
  borderColor,
  cardBg,
  bg,
  accent,
}: Props) {
  const [open, setOpen] = useState(false);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);

  useEffect(() => {
    listWorkshops().then(setWorkshops);
  }, []);

  if (workshops.length === 0) return null;

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
          {workshopId
            ? `Workshop: ${garageName}`
            : "Select from saved workshops"}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {workshopId ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onSelect(null, "");
              }}
              hitSlop={8}
            >
              <Text style={{ color: "#dc2626", fontSize: 13, fontWeight: "600" }}>Clear</Text>
            </Pressable>
          ) : null}
          <ChevronRight size={16} color={accent} />
        </View>
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
              Select Workshop
            </Text>
            <Pressable onPress={() => setOpen(false)}>
              <Text style={{ color: accent, fontSize: 16 }}>Cancel</Text>
            </Pressable>
          </View>

          <FlatList
            data={workshops}
            keyExtractor={(item) => String(item.id)}
            ListHeaderComponent={
              <Pressable
                onPress={() => {
                  onSelect(null, "");
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
                <Text style={{ fontSize: 15, color: textSecondary }}>None</Text>
              </Pressable>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item.id, item.name);
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
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 15, color: textPrimary, flex: 1 }}>{item.name}</Text>
                  {item.preferred ? (
                    <View
                      style={{
                        backgroundColor: accent + "20",
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: "600", color: accent }}>
                        Preferred
                      </Text>
                    </View>
                  ) : null}
                </View>
                {item.phone ? (
                  <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                    {item.phone}
                  </Text>
                ) : null}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </>
  );
}
