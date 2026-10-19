import { Pressable, StyleSheet, View } from "react-native";
import { spacing, useColors } from "@/lib/theme";
import { AppText } from "./AppText";

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <AppText variant="headline">{title}</AppText>
      {action && onAction ? (
        <Pressable accessibilityRole="button" hitSlop={{ top: 14, bottom: 14, left: 12, right: 12 }} onPress={onAction}>
          <AppText variant="caption" color={colors.primary}>
            {action}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: -spacing.sm },
});
