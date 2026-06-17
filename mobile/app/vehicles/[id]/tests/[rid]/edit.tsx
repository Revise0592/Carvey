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
import { deleteMot, getMot, updateMot, upsertMotReminder } from "@/lib/db";
import { useSettings } from "@/lib/SettingsContext";
import { useTheme } from "@/lib/theme";
import { Field, FieldDivider } from "@/components/FormField";

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

export default function EditTestScreen() {
  const { id, rid } = useLocalSearchParams<{ id: string; rid: string }>();
  const vehicleId = parseInt(id, 10);
  const recordId = parseInt(rid, 10);

  const [loading, setLoading] = useState(true);
  const [testDate, setTestDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
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

  useEffect(() => {
    getMot(recordId, vehicleId).then((r) => {
      if (!r) { router.back(); return; }
      setTestDate(r.testDate);
      setExpiryDate(r.expiryDate);
      setResult(r.result);
      setCost(r.cost ? String(r.cost) : "");
      setOdometer(r.odometer ? String(r.odometer) : "");
      setAdvisories(r.advisories ?? "");
      setCertificateRef(r.certificateRef ?? "");
      setLoading(false);
    });
  }, [recordId, vehicleId]);

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
      await updateMot(recordId, vehicleId, {
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

  function handleDelete() {
    Alert.alert(`Delete ${testLabel}`, `Are you sure you want to delete this ${testLabel} record?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteMot(recordId, vehicleId);
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

          <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 8 }}>Result *</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["pass", "advisory", "fail"] as Result[]).map((r) => {
              const colors = { pass: "#16a34a", advisory: "#d97706", fail: "#dc2626" };
              const isSelected = result === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => setResult(r)}
                  android_ripple={{ color: "rgba(0,0,0,0.1)", borderless: false }}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: "center",
                    borderWidth: 2,
                    borderColor: isSelected ? colors[r] : borderColor,
                    backgroundColor: isSelected ? colors[r] + "20" : "transparent",
                  }}
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
          <Text style={{ color: "#dc2626", fontSize: 15, fontWeight: "600" }}>Delete {testLabel}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
