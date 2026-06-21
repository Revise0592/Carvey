import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Switch,
  Text,
  View,
} from "react-native";
import { FormScrollView } from "@/components/FormScrollView";
import { router, useLocalSearchParams } from "expo-router";
import { deleteFuelRecord, getFuelRecord, updateFuelRecord } from "@/lib/db";
import { useTheme } from "@/lib/theme";
import { Field, FieldDivider } from "@/components/FormField";
import { DatePickerField } from "@/components/DatePickerField";
import { useSettings } from "@/lib/SettingsContext";
import { getVolumeUnit } from "@/lib/format";

const FUEL_TYPES = ["petrol", "diesel", "lpg", "other"] as const;
type FuelType = (typeof FUEL_TYPES)[number];

function fuelTypeLabel(type: FuelType, currency: string): string {
  if (type === "petrol") return currency === "USD" ? "Gasoline" : "Petrol";
  if (type === "diesel") return "Diesel";
  if (type === "lpg") return "LPG";
  return "Other";
}

export default function EditFuelScreen() {
  const { id, rid } = useLocalSearchParams<{ id: string; rid: string }>();
  const vehicleId = parseInt(id, 10);
  const recordId = parseInt(rid, 10);
  const { settings } = useSettings();
  const volumeUnit = getVolumeUnit(settings);
  const isKm = settings.distanceUnit === "km";

  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [odometer, setOdometer] = useState("");
  const [fuelType, setFuelType] = useState<FuelType>("petrol");
  const [volume, setVolume] = useState("");
  const [fullTank, setFullTank] = useState(true);
  const [totalCost, setTotalCost] = useState("");
  const [station, setStation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { accent, bg, cardBg, textPrimary, textSecondary, borderColor, inputBg } = useTheme();

  useEffect(() => {
    getFuelRecord(recordId, vehicleId).then((r) => {
      if (!r) { router.back(); return; }
      setDate(r.date);
      setOdometer(String(r.odometer));
      setFuelType((FUEL_TYPES.includes(r.fuelType as FuelType) ? r.fuelType : "other") as FuelType);
      const displayVol = volumeUnit === "gallons" ? r.volumeLitres / 3.78541 : r.volumeLitres;
      setVolume(displayVol.toFixed(2));
      setFullTank(Boolean(r.fullTank));
      setTotalCost(r.totalCost != null ? String(r.totalCost) : "");
      setStation(r.station ?? "");
      setNotes(r.notes ?? "");
      setLoading(false);
    });
  }, [recordId, vehicleId]);

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
      await updateFuelRecord(recordId, vehicleId, {
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

  function handleDelete() {
    Alert.alert("Delete record", "Are you sure you want to delete this fuel record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteFuelRecord(recordId, vehicleId);
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
