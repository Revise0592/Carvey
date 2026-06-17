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
import { createPlannedPurchase } from "@/lib/db";
import { useTheme } from "@/lib/theme";
import { Field, FieldDivider } from "@/components/FormField";

export default function NewPurchaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicleId = parseInt(id, 10);

  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { accent, bg, cardBg, textPrimary, textSecondary, borderColor, inputBg } = useTheme();

  async function handleSave() {
    if (!itemName.trim()) {
      Alert.alert("Required fields", "Please enter an item name.");
      return;
    }
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      Alert.alert("Invalid date", "Please use YYYY-MM-DD format (e.g. 2026-06-17).");
      return;
    }
    setSaving(true);
    try {
      await createPlannedPurchase({
        vehicleId,
        itemName: itemName.trim(),
        quantity: quantity ? parseInt(quantity, 10) : 1,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : 0,
        actualCost: null,
        supplier: supplier.trim() || null,
        url: null,
        dueDate: dueDate.trim() || null,
        dueOdometer: null,
        notes: notes.trim() || null,
        reminderId: null,
        purchasedDate: null,
        convertedToType: null,
        convertedRecordId: null,
        convertedAt: null,
      });
      router.back();
    } catch {
      Alert.alert("Error", "Could not save item. Please try again.");
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
            label="Item *"
            value={itemName}
            onChangeText={setItemName}
            placeholder="e.g. Wiper blades, Air filter"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            inputBg={inputBg}
          />
          <FieldDivider borderColor={borderColor} />
          <Field
            label="Quantity"
            value={quantity}
            onChangeText={setQuantity}
            placeholder="1"
            keyboardType="number-pad"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            inputBg={inputBg}
          />
          <FieldDivider borderColor={borderColor} />
          <Field
            label="Estimated Cost"
            value={estimatedCost}
            onChangeText={setEstimatedCost}
            placeholder="0.00"
            keyboardType="decimal-pad"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            inputBg={inputBg}
          />
          <FieldDivider borderColor={borderColor} />
          <Field
            label="Supplier"
            value={supplier}
            onChangeText={setSupplier}
            placeholder="e.g. Amazon, Euro Car Parts"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            inputBg={inputBg}
          />
          <FieldDivider borderColor={borderColor} />
          <Field
            label="Needed By (YYYY-MM-DD)"
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="Optional"
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
            {saving ? "Saving…" : "Save Item"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
