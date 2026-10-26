import { StyleSheet, View } from "react-native";
import type { RecitationGroup } from "@/lib/recitations";
import { spacing, useColors } from "@/lib/theme";
import { AppText } from "./AppText";

/** Titre d'un groupe de voix (mot par mot ou non) dans une liste de récitateurs. */
export function RecitationGroupHeader({ group }: { group: Pick<RecitationGroup, "title" | "detail"> }) {
  const colors = useColors();
  return (
    <View accessibilityRole="header" style={[styles.header, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
      <AppText variant="label" color={colors.primary}>
        {group.title}
      </AppText>
      <AppText variant="caption" muted>
        {group.detail}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 2, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
});
