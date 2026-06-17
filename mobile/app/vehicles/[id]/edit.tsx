import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { archiveVehicle, getVehicle, updateVehicle, type Vehicle } from "@/lib/db";
import { useSettings } from "@/lib/SettingsContext";
import { useTheme } from "@/lib/theme";

export default function EditVehicleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicleId = parseInt(id, 10);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [registration, setRegistration] = useState("");
  const [vin, setVin] = useState("");
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const [sold, setSold] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const { settings } = useSettings();
  const { isDark, accent, bg, cardBg, textPrimary, textSecondary, borderColor, inputBg } = useTheme();

  useEffect(() => {
    getVehicle(vehicleId).then((v) => {
      if (v) {
        setVehicle(v);
        setMake(v.make);
        setModel(v.model);
        setYear(v.year?.toString() ?? "");
        setRegistration(v.registration);
        setVin(v.vin ?? "");
        setOdometer(v.currentOdometer?.toString() ?? "");
        setNotes(v.notes ?? "");
        setSold(v.sold === 1);
      }
      setLoading(false);
    });
  }, [vehicleId]);

  async function handleSave() {
    if (!make.trim() || !model.trim() || !registration.trim()) {
      Alert.alert("Required fields", "Please fill in make, model and registration.");
      return;
    }
    setSaving(true);
    try {
      await updateVehicle(vehicleId, {
        make: make.trim(),
        model: model.trim(),
        year: year ? parseInt(year, 10) : null,
        registration: registration.trim().toUpperCase(),
        vin: vin.trim() || null,
        currentOdometer: odometer ? parseInt(odometer, 10) : null,
        purchasePrice: vehicle?.purchasePrice ?? null,
        purchaseDate: vehicle?.purchaseDate ?? null,
        notes: notes.trim() || null,
        sold,
      });
      router.back();
    } catch (err) {
      Alert.alert("Error", "Could not save changes. Please try again.");
      setSaving(false);
    }
  }

  function handleArchive() {
    Alert.alert(
      "Archive Vehicle",
      "This will hide the vehicle from your garage. You can view archived vehicles in settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            await archiveVehicle(vehicleId);
            router.replace("/(tabs)" as never);
          },
        },
      ]
    );
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
          <Field label="Make *" value={make} onChangeText={setMake} placeholder="e.g. Ford" inputBg={inputBg} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
          <FieldDivider borderColor={borderColor} />
          <Field label="Model *" value={model} onChangeText={setModel} placeholder="e.g. Focus" inputBg={inputBg} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
          <FieldDivider borderColor={borderColor} />
          <Field label="Registration *" value={registration} onChangeText={setRegistration} placeholder="e.g. AB12 CDE" autoCapitalize="characters" inputBg={inputBg} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
          <FieldDivider borderColor={borderColor} />
          <Field label="Year" value={year} onChangeText={setYear} placeholder="e.g. 2019" keyboardType="number-pad" inputBg={inputBg} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
          <FieldDivider borderColor={borderColor} />
          <Field label="VIN" value={vin} onChangeText={setVin} placeholder="Vehicle identification number" autoCapitalize="characters" inputBg={inputBg} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
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
          <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional notes" multiline inputBg={inputBg} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
          <FieldDivider borderColor={borderColor} />

          {/* Sold toggle */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 13, color: textSecondary }}>Mark as sold</Text>
            <Pressable
              onPress={() => setSold(!sold)}
              style={{
                width: 48,
                height: 28,
                borderRadius: 14,
                backgroundColor: sold ? accent : isDark ? "#374151" : "#d1d5db",
                justifyContent: "center",
                paddingHorizontal: 3,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: "#fff",
                  alignSelf: sold ? "flex-end" : "flex-start",
                }}
              />
            </Pressable>
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

        <Pressable
          onPress={handleArchive}
          android_ripple={{ color: "rgba(220,38,38,0.2)" }}
          style={{
            marginTop: 12,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#dc2626",
          }}
        >
          <Text style={{ color: "#dc2626", fontSize: 15, fontWeight: "500" }}>Archive Vehicle</Text>
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
