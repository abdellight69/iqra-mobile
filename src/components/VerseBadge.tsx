import { StyleSheet, View } from "react-native";
import { useColors } from "@/lib/theme";
import { AppText } from "./AppText";

/** Numéro dans un cercle à filet doré. */
export function VerseBadge({ value, size = 34 }: { value: number | string; size?: number }) {
  const colors = useColors();
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, borderColor: colors.accent }]}>
      <AppText variant="caption" color={colors.accent} style={{ fontSize: size > 38 ? 13 : 12 }}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
