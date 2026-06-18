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
import { deleteMaintenance, getMaintenance, updateMaintenance } from "@/lib/db";
import { useTheme } from "@/lib/theme";
import { Field, FieldDivider } from "@/components/FormField";
import { DatePickerField } from "@/components/DatePickerField";
import { CategoryPicker } from "@/components/CategoryPicker";

export default function EditMaintenanceScreen() {
  const { id, rid } = useLocalSearchParams<{ id: string; rid: string }>();
  const vehicleId = parseInt(id, 10);
  const recordId = parseInt(rid, 10);

  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { accent, bg, cardBg, textPrimary, textSecondary, borderColor, inputBg } = useTheme();

  useEffect(() => {
    getMaintenance(recordId, vehicleId).then((r) => {
      if (!r) { router.back(); return; }
      setDate(r.date);
      setCategory(r.category);
      setDescription(r.description);
      setCost(r.cost ? String(r.cost) : "");
      setOdometer(r.odometer ? String(r.odometer) : "");
      setNotes(r.notes ?? "");
      setLoading(false);
    });
  }, [recordId, vehicleId]);

  async function handleSave() {
    if (!date || !category.trim() || !description.trim()) {
      Alert.alert("Required fields", "Please fill in date, category and description.");
      return;
    }
    setSaving(true);
    try {
      await updateMaintenance(recordId, vehicleId, {
        date,
        category: category.trim(),
        description: description.trim(),
        cost: cost ? parseFloat(cost) : 0,
        odometer: odometer ? parseInt(odometer, 10) : null,
        notes: notes.trim() || null,
      });
      router.back();
    } catch {
      Alert.alert("Error", "Could not save record. Please try again.");
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert("Delete record", "Are you sure you want to delete this record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteMaintenance(recordId, vehicleId);
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
          <DatePickerField
            label="Date *"
            value={date}
            onChange={setDate}
            accent={accent}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            inputBg={inputBg}
          />
          <FieldDivider borderColor={borderColor} />
          <Field
            label="Category *"
            value={category}
            onChangeText={setCategory}
            placeholder="e.g. Oil Change, Tyres, Brakes"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            inputBg={inputBg}
          />
          <CategoryPicker
            category={category}
            onSelect={setCategory}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            cardBg={cardBg}
            bg={bg}
            accent={accent}
          />
          <FieldDivider borderColor={borderColor} />
          <Field
            label="Description *"
            value={description}
            onChangeText={setDescription}
            placeholder="What was done?"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            inputBg={inputBg}
          />
          <FieldDivider borderColor={borderColor} />
          <Field
            label="Cost"
            value={cost}
            onChangeText={setCost}
            placeholder="0.00"
            keyboardType="decimal-pad"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            inputBg={inputBg}
          />
          <FieldDivider borderColor={borderColor} />
          <Field
            label="Mileage / Odometer"
            value={odometer}
            onChangeText={setOdometer}
            placeholder="e.g. 45000"
            keyboardType="number-pad"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            inputBg={inputBg}
          />
          <FieldDivider borderColor={borderColor} />
          <Field
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes"
            multiline
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            inputBg={inputBg}
          />
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
          <Text style={{ color: "#dc2626", fontSize: 15, fontWeight: "600" }}>Delete Record</Text>
        </Pressable>
    </FormScrollView>
  );
}
