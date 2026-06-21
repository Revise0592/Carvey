import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";
import { FormScrollView } from "@/components/FormScrollView";
import { router, useLocalSearchParams } from "expo-router";
import { completeReminder, deleteReminder, getReminder, updateReminder } from "@/lib/db";
import { useTheme } from "@/lib/theme";
import { Field, FieldDivider } from "@/components/FormField";
import { DatePickerField } from "@/components/DatePickerField";

const RECURRENCE_OPTIONS = [
  { label: "None", value: "" },
  { label: "Monthly", value: "1 month" },
  { label: "3 Months", value: "3 months" },
  { label: "6 Months", value: "6 months" },
  { label: "Yearly", value: "12 months" },
];

export default function EditReminderScreen() {
  const { id, rid } = useLocalSearchParams<{ id: string; rid: string }>();
  const vehicleId = parseInt(id, 10);
  const recordId = parseInt(rid, 10);

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueOdometer, setDueOdometer] = useState("");
  const [recurrence, setRecurrence] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

  const { accent, bg, cardBg, textPrimary, textSecondary, borderColor, inputBg } = useTheme();

  useEffect(() => {
    getReminder(recordId, vehicleId).then((r) => {
      if (!r) { router.back(); return; }
      setTitle(r.title);
      setDueDate(r.dueDate ?? "");
      setDueOdometer(r.dueOdometer ? String(r.dueOdometer) : "");
      setRecurrence(r.recurrence ?? "");
      setIsCompleted(!!r.completedAt);
      setLoading(false);
    });
  }, [recordId, vehicleId]);

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert("Required fields", "Please enter a reminder title.");
      return;
    }
    setSaving(true);
    try {
      await updateReminder(recordId, vehicleId, {
        title: title.trim(),
        dueDate: dueDate || null,
        dueOdometer: dueOdometer ? parseInt(dueOdometer, 10) : null,
        recurrence: recurrence || null,
        completedAt: isCompleted ? new Date().toISOString() : null,
      });
      router.back();
    } catch {
      Alert.alert("Error", "Could not save reminder. Please try again.");
      setSaving(false);
    }
  }

  async function handleComplete() {
    await completeReminder(recordId, vehicleId);
    router.back();
  }

  function handleDelete() {
    Alert.alert("Delete reminder", "Are you sure you want to delete this reminder?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteReminder(recordId, vehicleId);
          router.back();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: bg }}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <FormScrollView bg={bg}>
        <View style={{ backgroundColor: cardBg, borderRadius: 12, padding: 16, borderWidth: 1, borderColor }}>
          <Field
            label="Title *"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Oil change due, Insurance renewal"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            inputBg={inputBg}
          />
          <FieldDivider borderColor={borderColor} />
          <DatePickerField
            label="Due Date"
            value={dueDate}
            onChange={setDueDate}
            optional
            accent={accent}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            inputBg={inputBg}
          />
          <FieldDivider borderColor={borderColor} />
          <Field
            label="Due Mileage / Odometer"
            value={dueOdometer}
            onChangeText={setDueOdometer}
            placeholder="Optional"
            keyboardType="number-pad"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            inputBg={inputBg}
          />
          <FieldDivider borderColor={borderColor} />

          <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 8 }}>Repeat</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {RECURRENCE_OPTIONS.map((opt) => {
              const isSelected = recurrence === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setRecurrence(opt.value)}
                  android_ripple={{ color: "rgba(0,0,0,0.1)", borderless: false }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: isSelected ? accent : borderColor,
                    backgroundColor: isSelected ? accent + "20" : "transparent",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "500", color: isSelected ? accent : textSecondary }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={saving}
          android_ripple={{ color: "rgba(255,255,255,0.25)" }}
          style={{
            marginTop: 20,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            backgroundColor: accent,
            opacity: saving ? 0.5 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>
            {saving ? "Saving…" : "Save Changes"}
          </Text>
        </Pressable>

        {!isCompleted ? (
          <Pressable
            onPress={handleComplete}
            android_ripple={{ color: "rgba(22,163,74,0.15)" }}
            style={{
              marginTop: 12,
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#16a34a",
            }}
          >
            <Text style={{ color: "#16a34a", fontSize: 15, fontWeight: "600" }}>Mark as Done</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={handleDelete}
          android_ripple={{ color: "rgba(220,38,38,0.15)" }}
          style={{
            marginTop: 12,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#dc2626",
          }}
        >
          <Text style={{ color: "#dc2626", fontSize: 15, fontWeight: "600" }}>Delete Reminder</Text>
        </Pressable>
    </FormScrollView>
  );
}
