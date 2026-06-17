import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { createVehicle } from "@/lib/db";
import { useSettings } from "@/lib/SettingsContext";
import { useTheme } from "@/lib/theme";

export default function NewVehicleScreen() {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [registration, setRegistration] = useState("");
  const [vin, setVin] = useState("");
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { settings } = useSettings();
  const { accent, bg, cardBg, textPrimary, textSecondary, borderColor, inputBg } = useTheme();

  async function handleSave() {
    if (!make.trim() || !model.trim() || !registration.trim()) {
      Alert.alert("Required fields", "Please fill in make, model and registration.");
      return;
    }
    setSaving(true);
    try {
      const id = await createVehicle({
        make: make.trim(),
        model: model.trim(),
        year: year ? parseInt(year, 10) : null,
        registration: registration.trim().toUpperCase(),
        vin: vin.trim() || null,
        currentOdometer: odometer ? parseInt(odometer, 10) : null,
        purchasePrice: null,
        purchaseDate: null,
        notes: notes.trim() || null,
      });
      router.replace(`/vehicles/${id}`);
    } catch (err) {
      Alert.alert("Error", "Could not save vehicle. Please try again.");
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={{ backgroundColor: cardBg, borderRadius: 12, padding: 16, borderWidth: 1, borderColor }}>
          <Field
            label="Make *"
            value={make}
            onChangeText={setMake}
            placeholder="e.g. Ford"
            inputBg={inputBg}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
          />
          <FieldDivider borderColor={borderColor} />
          <Field
            label="Model *"
            value={model}
            onChangeText={setModel}
            placeholder="e.g. Focus"
            inputBg={inputBg}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
          />
          <FieldDivider borderColor={borderColor} />
          <Field
            label="Registration *"
            value={registration}
            onChangeText={setRegistration}
            placeholder="e.g. AB12 CDE"
            autoCapitalize="characters"
            inputBg={inputBg}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
          />
          <FieldDivider borderColor={borderColor} />
          <Field
            label="Year"
            value={year}
            onChangeText={setYear}
            placeholder="e.g. 2019"
            keyboardType="number-pad"
            inputBg={inputBg}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
          />
          <FieldDivider borderColor={borderColor} />
          <Field
            label="VIN"
            value={vin}
            onChangeText={setVin}
            placeholder="Vehicle identification number"
            autoCapitalize="characters"
            inputBg={inputBg}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
          />
          <FieldDivider borderColor={borderColor} />
          <Field
            label={`Current ${settings.distanceUnit === "km" ? "Distance" : "Mileage"}`}
            value={odometer}
            onChangeText={setOdometer}
            placeholder="e.g. 45000"
            keyboardType="number-pad"
            inputBg={inputBg}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
          />
          <FieldDivider borderColor={borderColor} />
          <Field
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes"
            multiline
            inputBg={inputBg}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
          />
        </View>

        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => ({
            marginTop: 20,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            backgroundColor: accent,
            opacity: pressed || saving ? 0.7 : 1,
          })}
        >
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>
            {saving ? "Saving…" : "Save Vehicle"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldDivider({ borderColor }: { borderColor: string }) {
  return <View style={{ height: 1, backgroundColor: borderColor, marginVertical: 12 }} />;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  multiline,
  inputBg,
  textPrimary,
  textSecondary,
  borderColor,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
  inputBg: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}) {
  return (
    <View>
      <Text style={{ fontSize: 12, color: textSecondary, marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={textSecondary}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "words"}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        style={{
          fontSize: 15,
          color: textPrimary,
          backgroundColor: inputBg,
          borderWidth: 1,
          borderColor,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          minHeight: multiline ? 80 : undefined,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}
