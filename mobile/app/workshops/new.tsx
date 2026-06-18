import { useState } from "react";
import {
  Alert,
  Pressable,
  Switch,
  Text,
  View,
} from "react-native";
import { FormScrollView } from "@/components/FormScrollView";
import { router } from "expo-router";
import { createWorkshop } from "@/lib/db";
import { useTheme } from "@/lib/theme";
import { Field, FieldDivider } from "@/components/FormField";

export default function NewWorkshopScreen() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");
  const [preferred, setPreferred] = useState(false);
  const [saving, setSaving] = useState(false);

  const { accent, bg, cardBg, isDark, textPrimary, textSecondary, borderColor, inputBg } = useTheme();

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert("Required fields", "Please enter a workshop name.");
      return;
    }
    setSaving(true);
    try {
      await createWorkshop({
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        website: website.trim() || null,
        notes: notes.trim() || null,
        preferred,
      });
      router.back();
    } catch {
      Alert.alert("Error", "Could not save workshop. Please try again.");
      setSaving(false);
    }
  }

  return (
    <FormScrollView bg={bg}>
        <View style={{ backgroundColor: cardBg, borderRadius: 12, padding: 16, borderWidth: 1, borderColor }}>
          <Field
            label="Name *"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Halfords Autocentre"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            inputBg={inputBg}
          />
          <FieldDivider borderColor={borderColor} />
          <Field
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. 01234 567890"
            keyboardType="default"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            inputBg={inputBg}
          />
          <FieldDivider borderColor={borderColor} />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="e.g. service@garage.com"
            keyboardType="email-address"
            autoCapitalize="none"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            inputBg={inputBg}
          />
          <FieldDivider borderColor={borderColor} />
          <Field
            label="Address"
            value={address}
            onChangeText={setAddress}
            placeholder="e.g. 123 High Street, London"
            multiline
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            inputBg={inputBg}
          />
          <FieldDivider borderColor={borderColor} />
          <Field
            label="Website"
            value={website}
            onChangeText={setWebsite}
            placeholder="e.g. www.halfords.com"
            autoCapitalize="none"
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
          <FieldDivider borderColor={borderColor} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 14, color: textPrimary }}>Preferred workshop</Text>
            <Switch
              value={preferred}
              onValueChange={setPreferred}
              thumbColor={preferred ? accent : "#9ca3af"}
              trackColor={{ false: isDark ? "#374151" : "#d1d5db", true: accent + "80" }}
            />
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
            {saving ? "Saving…" : "Save Workshop"}
          </Text>
        </Pressable>
    </FormScrollView>
  );
}
