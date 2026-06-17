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
import { createMot, upsertMotReminder } from "@/lib/db";
import { useSettings } from "@/lib/SettingsContext";
import { useTheme } from "@/lib/theme";
import { Field, FieldDivider } from "@/components/FormField";

const today = new Date().toISOString().slice(0, 10);

function nextYear(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    d.setFullYear(d.getFullYear() + 1);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

type Result = "pass" | "fail" | "advisory";

export default function NewTestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicleId = parseInt(id, 10);

  const [testDate, setTestDate] = useState(today);
  const [expiryDate, setExpiryDate] = useState(nextYear(today));
  const [result, setResult] = useState<Result>("pass");
  const [cost, setCost] = useState("");
  const [odometer, setOdometer] = useState("");
  const [advisories, setAdvisories] = useState("");
  const [certificateRef, setCertificateRef] = useState("");
  const [saving, setSaving] = useState(false);

  const { settings } = useSettings();
  const { accent, bg, cardBg, textPrimary, textSecondary, borderColor, inputBg } = useTheme();

  const testLabel =
    settings.motFeature === "emissionsTest"
      ? "Emissions Test"
      : settings.motFeature === "disabled"
      ? "Test"
      : "MOT";

  async function handleSave() {
    if (!testDate.trim() || !expiryDate.trim()) {
      Alert.alert("Required fields", "Please fill in test date and expiry date.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(testDate) || !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
      Alert.alert("Invalid date", "Please use YYYY-MM-DD format (e.g. 2026-06-17).");
      return;
    }
    setSaving(true);
    try {
      await createMot({
        vehicleId,
        testDate,
        expiryDate,
        result,
        cost: cost ? parseFloat(cost) : 0,
        odometer: odometer ? parseInt(odometer, 10) : null,
        advisories: advisories.trim() || null,
        certificateRef: certificateRef.trim() || null,
      });
      if (result === "pass") {
        await upsertMotReminder(vehicleId, expiryDate);
      }
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
            label="Test Date * (YYYY-MM-DD)"
            value={testDate}
            onChangeText={(v) => {
              setTestDate(v);
              if (/^\d{4}-\d{2}-\d{2}$/.test(v)) setExpiryDate(nextYear(v));
            }}
            placeholder="2026-06-17"
            autoCapitalize="none"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            inputBg={inputBg}
          />
          <FieldDivider borderColor={borderColor} />
          <Field
            label="Expiry Date * (YYYY-MM-DD)"
            value={expiryDate}
            onChangeText={setExpiryDate}
            placeholder="2027-06-16"
            autoCapitalize="none"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            inputBg={inputBg}
          />
          <FieldDivider borderColor={borderColor} />

          {/* Result picker */}
          <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 8 }}>Result *</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["pass", "advisory", "fail"] as Result[]).map((r) => {
              const colors = { pass: "#16a34a", advisory: "#d97706", fail: "#dc2626" };
              const isSelected = result === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => setResult(r)}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: "center",
                    borderWidth: 2,
                    borderColor: isSelected ? colors[r] : borderColor,
                    backgroundColor: isSelected ? colors[r] + "20" : "transparent",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: isSelected ? colors[r] : textSecondary,
                      textTransform: "capitalize",
                    }}
                  >
                    {r}
                  </Text>
                </Pressable>
              );
            })}
          </View>

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
          {result === "advisory" ? (
            <>
              <FieldDivider borderColor={borderColor} />
              <Field
                label="Advisories"
                value={advisories}
                onChangeText={setAdvisories}
                placeholder="List advisory items"
                multiline
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                borderColor={borderColor}
                inputBg={inputBg}
              />
            </>
          ) : null}
          <FieldDivider borderColor={borderColor} />
          <Field
            label="Certificate / Reference"
            value={certificateRef}
            onChangeText={setCertificateRef}
            placeholder="Optional certificate number"
            autoCapitalize="characters"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            inputBg={inputBg}
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
            {saving ? "Saving…" : `Save ${testLabel}`}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
