import Ionicons from "@expo/vector-icons/Ionicons";
import { Children, Fragment, type ComponentProps, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { elevation, radius, spacing, useColors } from "@/lib/theme";
import { AppText } from "./AppText";

/** Groupe de lignes sur une même surface, séparées par des filets fins. */
export function ListGroup({ children, title }: { children: ReactNode; title?: string }) {
  const colors = useColors();
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.groupWrap}>
      {title ? (
        <AppText variant="label" muted style={styles.groupTitle}>
          {title}
        </AppText>
      ) : null}
      <View style={[styles.group, { backgroundColor: colors.surface }, elevation(colors)]}>
        {items.map((child, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={[styles.separator, { backgroundColor: colors.border }]} /> : null}
            {child}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

export function ListRow({
  icon,
  title,
  subtitle,
  right,
  onPress,
  danger,
  chevron = Boolean(onPress),
}: {
  icon?: ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  chevron?: boolean;
}) {
  const colors = useColors();
  const body = (
    <>
      {icon ? (
        <View style={[styles.icon, { backgroundColor: danger ? colors.dangerSoft : colors.primarySoft }]}>
          <Ionicons name={icon} size={17} color={danger ? colors.danger : colors.primary} />
        </View>
      ) : null}
      <View style={styles.flex}>
        <AppText color={danger ? colors.danger : undefined}>{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" muted>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      {chevron ? <Ionicons name="chevron-forward" size={16} color={colors.textFaint} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.55 : 1 }]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  groupWrap: { gap: spacing.sm },
  groupTitle: { marginLeft: spacing.xs },
  group: { borderRadius: radius.lg, overflow: "hidden" },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2, minHeight: 56 },
  icon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
