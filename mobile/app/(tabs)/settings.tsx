import { Alert, ScrollView, Switch, Text, TextInput, View, Pressable } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { useSettings, paletteAccentColors, type ThemePalette } from "@/lib/SettingsContext";
import { useTheme } from "@/lib/theme";
import { exportBackup, importBackup } from "@/lib/backup";

const CURRENCIES = [
  { label: "£ GBP", value: "GBP" as const },
  { label: "$ USD", value: "USD" as const },
  { label: "€ EUR", value: "EUR" as const },
];

const DISTANCE_UNITS = [
  { label: "Miles", value: "miles" as const },
  { label: "Kilometres", value: "km" as const },
];

const DATE_FORMATS = [
  { label: "01 Jan 2024", value: "dd-mon-yyyy" as const },
  { label: "2024-01-01", value: "iso" as const },
];

const MOT_FEATURE_OPTIONS = [
  { label: "MOT", value: "mot" as const },
  { label: "Emissions Test", value: "emissionsTest" as const },
  { label: "Disabled", value: "disabled" as const },
];

const DARK_MODE_OPTIONS = [
  { label: "Light", value: "light" as const },
  { label: "System", value: "system" as const },
  { label: "Dark", value: "dark" as const },
];

const PALETTES: Array<{ label: string; value: ThemePalette }> = [
  { label: "Default Blue", value: "default" },
  { label: "British Racing", value: "british-racing" },
  { label: "Midnight Alloy", value: "midnight-alloy" },
  { label: "Tan Leather", value: "tan-leather" },
  { label: "Signal Red", value: "signal-red" },
  { label: "Petrol Blue", value: "petrol-blue" },
  { label: "Heritage Cream", value: "heritage-cream" },
  { label: "Sunflower Yellow", value: "sunflower-yellow" },
  { label: "Slate Blue", value: "slate-blue" },
  { label: "Forest Green", value: "forest-green" },
];

export default function SettingsScreen() {
  const { settings, updateSetting } = useSettings();
  const { isDark, accent, bg, cardBg, textPrimary, textSecondary, borderColor, inputBg } = useTheme();
  const [nameInput, setNameInput] = useState(settings.collectionName);

  async function handleExport() {
    try {
      await exportBackup();
    } catch {
      Alert.alert("Export Failed", "Could not export backup. Please try again.");
    }
  }

  async function handleImport() {
    try {
      const result = await importBackup();
      if (!result) return;
      if (result.error) {
        Alert.alert("Import Failed", result.error);
        return;
      }
      Alert.alert(
        "Import Complete",
        `Added ${result.vehiclesImported} vehicle${result.vehiclesImported !== 1 ? "s" : ""} and ${result.recordsImported} record${result.recordsImported !== 1 ? "s" : ""}.`
      );
    } catch {
      Alert.alert("Import Failed", "Could not import backup. Please try again.");
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ paddingBottom: 40 }}>
      <Section title="Personalisation" cardBg={cardBg} textPrimary={textPrimary} borderColor={borderColor}>
        <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 8 }}>Collection name</Text>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <TextInput
            value={nameInput}
            onChangeText={setNameInput}
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={() => updateSetting("collectionName", nameInput.trim() || "My cars")}
            style={{
              flex: 1,
              backgroundColor: inputBg,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 8,
              fontSize: 14,
              color: textPrimary,
              borderWidth: 1,
              borderColor,
            }}
          />
          <Pressable
            onPress={() => updateSetting("collectionName", nameInput.trim() || "My cars")}
            android_ripple={{ color: "rgba(255,255,255,0.25)" }}
            style={{
              backgroundColor: accent,
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>Save</Text>
          </Pressable>
        </View>
      </Section>

      <Section title="Regional" cardBg={cardBg} textPrimary={textPrimary} borderColor={borderColor}>
        <SegmentedRow
          label="Currency"
          options={CURRENCIES}
          value={settings.currency}
          onChange={(v) => updateSetting("currency", v)}
          accent={accent}
          isDark={isDark}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          borderColor={borderColor}
        />
        <RowDivider borderColor={borderColor} />
        <SegmentedRow
          label="Distance"
          options={DISTANCE_UNITS}
          value={settings.distanceUnit}
          onChange={(v) => updateSetting("distanceUnit", v)}
          accent={accent}
          isDark={isDark}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          borderColor={borderColor}
        />
        <RowDivider borderColor={borderColor} />
        <SegmentedRow
          label="Date format"
          options={DATE_FORMATS}
          value={settings.dateFormat}
          onChange={(v) => updateSetting("dateFormat", v)}
          accent={accent}
          isDark={isDark}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          borderColor={borderColor}
        />
        <RowDivider borderColor={borderColor} />
        <SegmentedRow
          label="Test type"
          options={MOT_FEATURE_OPTIONS}
          value={settings.motFeature}
          onChange={(v) => updateSetting("motFeature", v)}
          accent={accent}
          isDark={isDark}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          borderColor={borderColor}
        />
      </Section>

      <Section title="Appearance" cardBg={cardBg} textPrimary={textPrimary} borderColor={borderColor}>
        <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 10 }}>Colour theme</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {PALETTES.map((p) => (
            <Pressable
              key={p.value}
              onPress={() => updateSetting("palette", p.value)}
              android_ripple={{ color: "rgba(0,0,0,0.1)", borderless: false }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: settings.palette === p.value ? paletteAccentColors[p.value] : borderColor,
                backgroundColor:
                  settings.palette === p.value ? paletteAccentColors[p.value] + "20" : "transparent",
              }}
            >
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: paletteAccentColors[p.value],
                }}
              />
              <Text style={{ fontSize: 12, color: textPrimary }}>{p.label}</Text>
            </Pressable>
          ))}
        </View>
        <RowDivider borderColor={borderColor} />
        <SegmentedRow
          label="Dark mode"
          options={DARK_MODE_OPTIONS}
          value={settings.darkMode}
          onChange={(v) => updateSetting("darkMode", v)}
          accent={accent}
          isDark={isDark}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          borderColor={borderColor}
        />
      </Section>

      <Section title="Security" cardBg={cardBg} textPrimary={textPrimary} borderColor={borderColor}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 14, color: textPrimary, fontWeight: "500" }}>Biometric lock</Text>
            <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
              Require fingerprint or face ID when opening the app
            </Text>
          </View>
          <Switch
            value={settings.securityEnabled === "true"}
            onValueChange={(v) => updateSetting("securityEnabled", v ? "true" : "false")}
            thumbColor={settings.securityEnabled === "true" ? accent : "#9ca3af"}
            trackColor={{ false: isDark ? "#374151" : "#d1d5db", true: accent + "80" }}
          />
        </View>
      </Section>

      <Section title="Manage" cardBg={cardBg} textPrimary={textPrimary} borderColor={borderColor}>
        <Pressable
          onPress={() => router.push("/workshops")}
          android_ripple={{ color: "rgba(0,0,0,0.08)" }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={{ fontSize: 14, color: textPrimary, fontWeight: "500" }}>Workshops</Text>
              <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                Manage garages and service centres
              </Text>
            </View>
            <Text style={{ fontSize: 20, color: textSecondary }}>›</Text>
          </View>
        </Pressable>
        <RowDivider borderColor={borderColor} />
        <Pressable
          onPress={() => router.push("/categories")}
          android_ripple={{ color: "rgba(0,0,0,0.08)" }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={{ fontSize: 14, color: textPrimary, fontWeight: "500" }}>Maintenance Categories</Text>
              <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                Manage service and maintenance categories
              </Text>
            </View>
            <Text style={{ fontSize: 20, color: textSecondary }}>›</Text>
          </View>
        </Pressable>
      </Section>

      <Section title="Data" cardBg={cardBg} textPrimary={textPrimary} borderColor={borderColor}>
        <Pressable
          onPress={handleExport}
          android_ripple={{ color: "rgba(0,0,0,0.08)" }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={{ fontSize: 14, color: textPrimary, fontWeight: "500" }}>Export backup</Text>
              <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                Save all data as a JSON file
              </Text>
            </View>
            <Text style={{ fontSize: 20, color: textSecondary }}>›</Text>
          </View>
        </Pressable>
        <RowDivider borderColor={borderColor} />
        <Pressable
          onPress={handleImport}
          android_ripple={{ color: "rgba(0,0,0,0.08)" }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={{ fontSize: 14, color: textPrimary, fontWeight: "500" }}>Restore from backup</Text>
              <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                Import vehicles and records from a backup file
              </Text>
            </View>
            <Text style={{ fontSize: 20, color: textSecondary }}>›</Text>
          </View>
        </Pressable>
      </Section>

      <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
        <Text style={{ fontSize: 12, color: textSecondary, textAlign: "center" }}>
          Carvey — Car Maintenance Tracker
        </Text>
      </View>
    </ScrollView>
  );
}

function Section({
  title,
  children,
  cardBg,
  textPrimary,
  borderColor,
}: {
  title: string;
  children: React.ReactNode;
  cardBg: string;
  textPrimary: string;
  borderColor: string;
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: textPrimary,
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {title}
      </Text>
      <View style={{ backgroundColor: cardBg, borderRadius: 12, padding: 16, borderWidth: 1, borderColor }}>
        {children}
      </View>
    </View>
  );
}

function RowDivider({ borderColor }: { borderColor: string }) {
  return <View style={{ height: 1, backgroundColor: borderColor, marginVertical: 12 }} />;
}

function SegmentedRow<T extends string>({
  label,
  options,
  value,
  onChange,
  accent,
  isDark,
  textPrimary,
  textSecondary,
  borderColor,
}: {
  label: string;
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (v: T) => void;
  accent: string;
  isDark: boolean;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}) {
  return (
    <View>
      <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 8 }}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {options.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            android_ripple={{ color: "rgba(0,0,0,0.1)", borderless: false }}
            style={{
              flex: 1,
              paddingVertical: 7,
              borderRadius: 8,
              alignItems: "center",
              backgroundColor: value === opt.value ? accent : isDark ? "#374151" : "#f3f4f6",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "500",
                color: value === opt.value ? "#ffffff" : textSecondary,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
