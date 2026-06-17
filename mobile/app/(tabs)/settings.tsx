import { ScrollView, Text, View, Pressable, Switch } from "react-native";
import { useColorScheme } from "react-native";
import { useSettings, paletteAccentColors, type ThemePalette } from "@/lib/SettingsContext";

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const accent = paletteAccentColors[settings.palette];

  const bg = isDark ? "#111827" : "#f9fafb";
  const cardBg = isDark ? "#1f2937" : "#ffffff";
  const textPrimary = isDark ? "#f3f4f6" : "#111827";
  const textSecondary = isDark ? "#9ca3af" : "#6b7280";
  const borderColor = isDark ? "#374151" : "#e5e7eb";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ paddingBottom: 40 }}>
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
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: settings.palette === p.value ? paletteAccentColors[p.value] : borderColor,
                backgroundColor: settings.palette === p.value
                  ? paletteAccentColors[p.value] + "20"
                  : "transparent",
                opacity: pressed ? 0.7 : 1,
              })}
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
      <Text style={{ fontSize: 12, fontWeight: "600", color: textPrimary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
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
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 7,
              borderRadius: 8,
              alignItems: "center",
              backgroundColor:
                value === opt.value ? accent : isDark ? "#374151" : "#f3f4f6",
              opacity: pressed ? 0.7 : 1,
            })}
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
