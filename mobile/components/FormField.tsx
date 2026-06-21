import { Text, TextInput, View } from "react-native";

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad" | "decimal-pad" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  inputBg: string;
};

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  multiline,
  textPrimary,
  textSecondary,
  borderColor,
  inputBg,
}: FieldProps) {
  return (
    <View>
      <Text style={{ fontSize: 12, color: textSecondary, marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={textSecondary}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "sentences"}
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

export function FieldDivider({ borderColor }: { borderColor: string }) {
  return <View style={{ height: 1, backgroundColor: borderColor, marginVertical: 12 }} />;
}
