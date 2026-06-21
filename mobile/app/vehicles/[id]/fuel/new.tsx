import { useState } from "react";
import {
  Alert,
  Pressable,
  Switch,
  Text,
  View,
} from "react-native";
import { FormScrollView } from "@/components/FormScrollView";
import { router, useLocalSearchParams } from "expo-router";
import { createFuelRecord } from "@/lib/db";
import { useTheme } from "@/lib/theme";
import { Field, FieldDivider } from "@/components/FormField";
import { DatePickerField } from "@/components/DatePickerField";
import { useSettings } from "@/lib/SettingsContext";
import { getVolumeUnit } from "@/lib/format";

const today = new Date().toISOString().slice(0, 10);

const FUEL_TYPES = ["petrol", "diesel", "lpg", "other"] as const;
type FuelType = (typeof FUEL_TYPES)[number];

function fuelTypeLabel(type: FuelType, currency: string): string {
  if (type === "petrol") return currency === "USD" ? "Gasoline" : "Petrol";
  if (type === "diesel") return "Diesel";
  if (type === "lpg") return "LPG";
  return "Other";
}

export default function NewFuelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicleId = parseInt(id, 10);
  const { settings } = useSettings();
  const volumeUnit = getVolumeUnit(settings);
  const isKm = settings.distanceUnit === "km";

  const [date, setDate] = useState(today);
  const [odometer, setOdometer] = useState("");
  const [fuelType, setFuelType] = useState<FuelType>("petrol");
  const [volume, setVolume] = useState("");
  const [fullTank, setFullTank] = useState(true);
  const [totalCost, setTotalCost] = useState("");
  const [station, setStation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { accent, bg, cardBg, textPrimary, textSecondary, borderColor, inputBg } = useTheme();

  async function handleSave() {
    if (!date || !odometer || !volume) {
      Alert.alert("Required fields", "Please fill in date, odometer, and volume.");
      return;
    }
    const vol = parseFloat(volume);
    if (isNaN(vol) || vol <= 0) {
      Alert.alert("Invalid volume", "Please enter a valid volume.");
      return;
    }
    const volumeLitres = volumeUnit === "gallons" ? vol * 3.78541 : vol;
    setSaving(true);
    try {
      await createFuelRecord({
        vehicleId,
        date,
        odometer: parseInt(odometer, 10),
        volumeLitres,
        totalCost: totalCost ? parseFloat(totalCost) : null,
        fuelType,
        fullTank: fullTank ? 1 : 0,
        station: station.trim() || null,
        notes: notes.trim() || null,
      });
      router.back();
    } catch {
      Alert.alert("Error", "Could not save record. Please try again.");
      setSaving(false);
    }
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
          label={isKm ? "Odometer (km) *" : "Mileage *"}
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

        {/* Fuel type selector */}
        <Text style={{ fontSize: 12, fontWeight: "600", color: textSecondary, marginBottom: 8 }}>
          Fuel Type *
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
          {FUEL_TYPES.map((type) => (
            <Pressable
              key={type}
              onPress={() => setFuelType(type)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 8,
                borderWidth: 1.5,
                borderColor: fuelType === type ? accent : borderColor,
                backgroundColor: fuelType === type ? accent + "20" : "transparent",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: fuelType === type ? accent : textSecondary }}>
                {fuelTypeLabel(type, settings.currency)}
              </Text>
            </Pressable>
          ))}
        </View>

        <FieldDivider borderColor={borderColor} />
        <Field
          label={`${volumeUnit === "gallons" ? "Gallons" : "Litres"} *`}
          value={volume}
          onChangeText={setVolume}
          placeholder={volumeUnit === "gallons" ? "e.g. 12.50" : "e.g. 47.20"}
          keyboardType="decimal-pad"
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          borderColor={borderColor}
          inputBg={inputBg}
        />
        <FieldDivider borderColor={borderColor} />

        {/* Full tank toggle */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: "500", color: textPrimary }}>Full Tank</Text>
          <Switch
            value={fullTank}
            onValueChange={setFullTank}
            trackColor={{ true: accent }}
            thumbColor="#fff"
          />
        </View>

        <FieldDivider borderColor={borderColor} />
        <Field
          label="Total Cost"
          value={totalCost}
          onChangeText={setTotalCost}
          placeholder="0.00"
          keyboardType="decimal-pad"
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          borderColor={borderColor}
          inputBg={inputBg}
        />
        <FieldDivider borderColor={borderColor} />
        <Field
          label="Station"
          value={station}
          onChangeText={setStation}
          placeholder="e.g. BP, Shell"
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
    </FormScrollView>
  );
}
