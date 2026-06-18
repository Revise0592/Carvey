import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { deleteRepair, getRepair, updateRepair } from "@/lib/db";
import { useTheme } from "@/lib/theme";
import { Field, FieldDivider } from "@/components/FormField";
import { DatePickerField } from "@/components/DatePickerField";
import { WorkshopPicker } from "@/components/WorkshopPicker";

export default function EditRepairScreen() {
  const { id, rid } = useLocalSearchParams<{ id: string; rid: string }>();
  const vehicleId = parseInt(id, 10);
  const recordId = parseInt(rid, 10);

  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [fault, setFault] = useState("");
  const [garage, setGarage] = useState("");
  const [workshopId, setWorkshopId] = useState<number | null>(null);
  const [cost, setCost] = useState("");
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { accent, bg, cardBg, textPrimary, textSecondary, borderColor, inputBg } = useTheme();

  useEffect(() => {
    getRepair(recordId, vehicleId).then((r) => {
      if (!r) { router.back(); return; }
      setDate(r.date);
      setFault(r.fault);
      setGarage(r.garage ?? "");
      setWorkshopId(r.workshopId);
      setCost(r.cost ? String(r.cost) : "");
      setOdometer(r.odometer ? String(r.odometer) : "");
      setNotes(r.notes ?? "");
      setLoading(false);
    });
  }, [recordId, vehicleId]);

  async function handleSave() {
    if (!date || !fault.trim()) {
      Alert.alert("Required fields", "Please fill in date and fault description.");
      return;
    }
    setSaving(true);
    try {
      await updateRepair(recordId, vehicleId, {
        date,
        fault: fault.trim(),
        garage: garage.trim() || null,
        workshopId,
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
          await deleteRepair(recordId, vehicleId);
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
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
            label="Fault / Work Done *"
            value={fault}
            onChangeText={setFault}
            placeholder="e.g. Replace front brake pads"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            inputBg={inputBg}
          />
          <FieldDivider borderColor={borderColor} />
          <Field
            label="Garage / Workshop"
            value={garage}
            onChangeText={(v) => { setGarage(v); if (v !== garage) setWorkshopId(null); }}
            placeholder="e.g. Halfords Autocentre"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            inputBg={inputBg}
          />
          <WorkshopPicker
            workshopId={workshopId}
            garageName={garage}
            onSelect={(id, name) => { setWorkshopId(id); setGarage(name); }}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            cardBg={cardBg}
            bg={bg}
            accent={accent}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
