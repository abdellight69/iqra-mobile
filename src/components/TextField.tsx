import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { fonts, radius, spacing, useColors } from "@/lib/theme";
import { AppText } from "./AppText";

export type TextFieldProps = TextInputProps & { label: string; error?: string | null; secure?: boolean };

export function TextField({ label, error, secure, style, ...props }: TextFieldProps) {
  const colors = useColors();
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <View
        style={[
          styles.field,
          {
            backgroundColor: focused ? colors.surface : colors.surfaceMuted,
            borderColor: error ? colors.danger : focused ? colors.primary : colors.surfaceMuted,
          },
        ]}>
        <TextInput
          {...props}
          accessibilityLabel={label}
          secureTextEntry={secure && hidden}
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.primary}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[styles.input, { color: colors.text }, style]}
        />
        {secure && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Afficher le mot de passe" : "Masquer le mot de passe"}
            hitSlop={12}
            onPress={() => setHidden((h) => !h)}>
            <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={19} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs + 2 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 54,
    gap: spacing.sm,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, paddingVertical: spacing.md },
});
