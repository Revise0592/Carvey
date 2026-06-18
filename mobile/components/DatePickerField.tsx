import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  inputBg: string;
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDisplay(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const m = parseInt(parts[1], 10) - 1;
  if (m < 0 || m > 11) return iso;
  return `${parts[2]} ${MONTHS[m]} ${parts[0]}`;
}

function isoToDate(iso: string): Date {
  if (!iso) return new Date();
  const [y, mo, d] = iso.split("-").map(Number);
  const date = new Date(y, mo - 1, d);
  return isNaN(date.getTime()) ? new Date() : date;
}

function dateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DatePickerField({
  label,
  value,
  onChange,
  optional,
  accent,
  textPrimary,
  textSecondary,
  borderColor,
  inputBg,
}: Props) {
  const [show, setShow] = useState(false);

  function handleChange(event: { type: string }, date?: Date) {
    if (Platform.OS === "android") {
      setShow(false);
      if (event.type === "set" && date) {
        onChange(dateToIso(date));
      }
    } else {
      if (date) onChange(dateToIso(date));
    }
  }

  const displayText = value
    ? formatDisplay(value)
    : optional
    ? "Not set"
    : "Tap to select";

  return (
    <View>
      <Text style={{ fontSize: 12, color: textSecondary, marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable
          onPress={() => setShow(true)}
          android_ripple={{ color: "rgba(0,0,0,0.06)" }}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: inputBg,
            borderWidth: 1,
            borderColor,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <Text style={{ fontSize: 15, color: value ? textPrimary : textSecondary }}>
            {displayText}
          </Text>
          <Text style={{ fontSize: 12, color: textSecondary }}>▼</Text>
        </Pressable>
        {optional && value ? (
          <Pressable
            onPress={() => onChange("")}
            hitSlop={8}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 6,
              borderWidth: 1,
              borderColor,
            }}
          >
            <Text style={{ fontSize: 13, color: textSecondary }}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      {show ? (
        <>
          {Platform.OS === "ios" ? (
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 4 }}>
              <Pressable onPress={() => setShow(false)}>
                <Text style={{ color: accent, fontSize: 15, fontWeight: "600", padding: 8 }}>
                  Done
                </Text>
              </Pressable>
            </View>
          ) : null}
          <DateTimePicker
            value={isoToDate(value)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleChange}
          />
        </>
      ) : null}
    </View>
  );
}
