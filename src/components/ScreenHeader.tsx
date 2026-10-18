import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { spacing } from "@/lib/theme";
import { AppText } from "./AppText";

/** En-tête éditorial des onglets : surtitre discret, grand titre serif, action à droite. */
export function ScreenHeader({ eyebrow, title, subtitle, right }: { eyebrow?: string; title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.flex}>
          {eyebrow ? (
            <AppText variant="label" muted>
              {eyebrow}
            </AppText>
          ) : null}
          <AppText variant="display">{title}</AppText>
        </View>
        {right}
      </View>
      {subtitle ? <AppText muted>{subtitle}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: spacing.xs },
  container: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "flex-end", gap: spacing.md },
});
