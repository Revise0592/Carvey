import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";
import { FormScrollView } from "@/components/FormScrollView";
import { router, useLocalSearchParams } from "expo-router";
import { deletePlannedPurchase, getPlannedPurchase, updatePlannedPurchase } from "@/lib/db";
import { useTheme } from "@/lib/theme";
import { Field, FieldDivider } from "@/components/FormField";
import { DatePickerField } from "@/components/DatePickerField";

const today = new Date().toISOString().slice(0, 10);

export default function EditPurchaseScreen() {
  const { id, rid } = useLocalSearchParams<{ id: string; rid: string }>();
  const vehicleId = parseInt(id, 10);
  const recordId = parseInt(rid, 10);

  const [loading, setLoading] = useState(true);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isPurchased, setIsPurchased] = useState(false);
  const [saving, setSaving] = useState(false);

  const { accent, bg, cardBg, textPrimary, textSecondary, borderColor, inputBg } = useTheme();

  useEffect(() => {
    getPlannedPurchase(recordId, vehicleId).then((r) => {
      if (!r) { router.back(); return; }
      setItemName(r.itemName);
      setQuantity(String(r.quantity));
      setEstimatedCost(r.estimatedCost ? String(r.estimatedCost) : "");
      setSupplier(r.supplier ?? "");
      setDueDate(r.dueDate ?? "");
      setNotes(r.notes ?? "");
      setIsPurchased(!!r.purchasedDate);
      setLoading(false);
    });
  }, [recordId, vehicleId]);

  async function handleSave() {
    if (!itemName.trim()) {
      Alert.alert("Required fields", "Please enter an item name.");
      return;
    }
    setSaving(true);
    try {
      await updatePlannedPurchase(recordId, vehicleId, {
        itemName: itemName.trim(),
        quantity: quantity ? parseInt(quantity, 10) : 1,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : 0,
        supplier: supplier.trim() || null,
        dueDate: dueDate || null,
        notes: notes.trim() || null,
      });
      router.back();
    } catch {
      Alert.alert("Error", "Could not save item. Please try again.");
      setSaving(false);
    }
  }

  async function handleMarkBought() {
    Alert.alert("Mark as bought", "Record this item as purchased today?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark as Bought",
        onPress: async () => {
          await updatePlannedPurchase(recordId, vehicleId, { purchasedDate: today });
          router.back();
        },
      },
    ]);
  }

  function handleDelete() {
    Alert.alert("Delete item", "Are you sure you want to delete this planned purchase?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deletePlannedPurchase(recordId, vehicleId);
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
          <DatePickerField
            label="Needed By"
            value={dueDate}
            onChange={setDueDate}
            optional
            accent={accent}
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

        {!isPurchased ? (
          <Pressable
            onPress={handleMarkBought}
            android_ripple={{ color: "rgba(22,163,74,0.15)" }}
            style={{
              marginTop: 12,
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#16a34a",
            }}
          >
            <Text style={{ color: "#16a34a", fontSize: 15, fontWeight: "600" }}>Mark as Bought</Text>
          </Pressable>
        ) : null}

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
          <Text style={{ color: "#dc2626", fontSize: 15, fontWeight: "600" }}>Delete Item</Text>
        </Pressable>
    </FormScrollView>
  );
}
