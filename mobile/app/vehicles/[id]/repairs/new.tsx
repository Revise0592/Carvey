import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { createRepair } from "@/lib/db";
import { useTheme } from "@/lib/theme";
import { Field, FieldDivider } from "@/components/FormField";
import { WorkshopPicker } from "@/components/WorkshopPicker";

const today = new Date().toISOString().slice(0, 10);

export default function NewRepairScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicleId = parseInt(id, 10);

  const [date, setDate] = useState(today);
  const [fault, setFault] = useState("");
  const [garage, setGarage] = useState("");
  const [workshopId, setWorkshopId] = useState<number | null>(null);
  const [cost, setCost] = useState("");
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { accent, bg, cardBg, textPrimary, textSecondary, borderColor, inputBg } = useTheme();

  async function handleSave() {
    if (!date.trim() || !fault.trim()) {
      Alert.alert("Required fields", "Please fill in date and fault description.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert("Invalid date", "Please use YYYY-MM-DD format (e.g. 2026-06-17).");
      return;
    }
    setSaving(true);
    try {
      await createRepair({
        vehicleId,
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={{ backgroundColor: cardBg, borderRadius: 12, padding: 16, borderWidth: 1, borderColor }}>
          <Field
            label="Date * (YYYY-MM-DD)"
            value={date}
            onChangeText={setDate}
            placeholder="2026-06-17"
            autoCapitalize="none"
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
            {saving ? "Saving…" : "Save Record"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
