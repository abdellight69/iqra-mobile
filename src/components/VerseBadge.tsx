import { StyleSheet, View } from "react-native";
import { useColors } from "@/lib/theme";
import { AppText } from "./AppText";

/** Numéro dans un losange doré, inspiré des ornements de fin de verset. */
export function VerseBadge({ value, size = 36 }: { value: number | string; size?: number }) {
  const colors = useColors();
  const inner = size * 0.72;
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View style={[styles.diamond, { width: inner, height: inner, borderColor: colors.accent, backgroundColor: colors.accentSoft }]} />
      <AppText variant="caption" style={styles.text} color={colors.primaryStrong}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  diamond: { position: "absolute", borderWidth: 1.5, borderRadius: 6, transform: [{ rotate: "45deg" }] },
  text: { fontWeight: "700", fontSize: 12 },
});
