import Ionicons from "@expo/vector-icons/Ionicons";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ENCOURAGEMENT_ORDER, ENCOURAGEMENTS, METRICS, PERIODS, daysLeft, fraction, goalTitle, quantity } from "@/lib/families-format";
import { radius, spacing, useColors } from "@/lib/theme";
import type { EncouragementKind, FamilyGoal, FamilyMember } from "@/lib/types";
import { AppText } from "./AppText";
import { Button } from "./Button";
import { Card } from "./Card";
import { ProfileAvatar } from "./ProfileAvatar";
import { ProgressBar } from "./ProgressBar";

/** Pastille de choix (mesure, période, partage…). */
export function Chip({ label, selected, onPress, icon }: { label: string; selected: boolean; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoft : colors.surface, opacity: pressed ? 0.7 : 1 },
      ]}>
      {icon ? <Ionicons name={icon} size={16} color={selected ? colors.primary : colors.textMuted} /> : null}
      <AppText variant="bodyStrong" color={selected ? colors.primary : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const STATUS_LABEL = { pending: "en attente", declined: "a refusé", left: "a quitté" } as const;

/**
 * Un objectif de la famille et où chacun en est. Pas de classement : les membres gardent l'ordre
 * de la famille, et une progression non partagée s'affiche comme telle.
 */
export function FamilyGoalCard({
  goal,
  members,
  today,
  onRespond,
  onEncourage,
  compact = false,
}: {
  goal: FamilyGoal;
  members: FamilyMember[];
  today: string;
  onRespond?: (goal: FamilyGoal, userId: string, status: "accepted" | "declined") => void;
  onEncourage?: (goal: FamilyGoal, member: FamilyMember) => void;
  compact?: boolean;
}) {
  const colors = useColors();
  const byId = new Map(members.map((m) => [m.userId, m]));
  const order = new Map(members.map((m, i) => [m.userId, i]));
  const participants = [...goal.participants].sort((a, b) => (order.get(a.userId) ?? 0) - (order.get(b.userId) ?? 0));
  const names = participants.map((p) => byId.get(p.userId)?.displayName ?? "?");
  const title = goalTitle(goal, goal.scope === "assigned" ? names : []);
  const left = daysLeft(goal.range.end, today);
  const pendingMine = participants.filter((p) => p.status === "pending" && p.canRespond);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name={METRICS[goal.metric].icon} size={18} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{title}</AppText>
          <AppText variant="caption" muted>
            {PERIODS[goal.period].current.charAt(0).toUpperCase() + PERIODS[goal.period].current.slice(1)} · encore {left} jour{left > 1 ? "s" : ""}
          </AppText>
        </View>
      </View>

      {goal.scope === "shared" && goal.total !== null ? (
        <View style={styles.shared}>
          <View style={styles.row}>
            <AppText variant="headline">{quantity(goal.metric, goal.total)}</AppText>
            <AppText muted> sur {goal.target.toLocaleString("fr-FR")}</AppText>
            {goal.done ? <Ionicons name="checkmark-circle" size={20} color={colors.success} style={styles.check} /> : null}
          </View>
          <ProgressBar value={fraction(goal.total, goal.target)} color={goal.done ? colors.success : colors.primary} height={8} />
        </View>
      ) : null}

      {compact
        ? null
        : participants.map((p) => {
            const member = byId.get(p.userId);
            if (!member) return null;
            const label =
              p.status === "accepted"
                ? p.value === null
                  ? "progression non partagée"
                  : goal.scope === "shared"
                    ? `${quantity(goal.metric, p.value)}`
                    : `${p.value.toLocaleString("fr-FR")} / ${goal.target.toLocaleString("fr-FR")}`
                : STATUS_LABEL[p.status];
            return (
              <View key={p.userId} style={styles.member}>
                <ProfileAvatar name={member.displayName} avatar={member.avatar} size={28} />
                <View style={styles.flex}>
                  <View style={styles.row}>
                    <AppText style={styles.flex} numberOfLines={1}>
                      {member.isMe ? `${member.displayName} (moi)` : member.displayName}
                    </AppText>
                    <AppText variant="caption" muted>
                      {label}
                    </AppText>
                    {p.done ? <Ionicons name="checkmark-circle" size={16} color={colors.success} style={styles.check} /> : null}
                  </View>
                  {goal.scope !== "shared" && p.status === "accepted" && p.value !== null ? (
                    <ProgressBar value={fraction(p.value, goal.target)} color={p.done ? colors.success : colors.primary} />
                  ) : null}
                </View>
                {onEncourage && !member.isMe && p.status === "accepted" ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Encourager ${member.displayName}`}
                    hitSlop={8}
                    onPress={() => onEncourage(goal, member)}
                    style={styles.encourage}>
                    <Ionicons name="heart-outline" size={18} color={colors.accent} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}

      {onRespond
        ? pendingMine.map((p) => {
            const member = byId.get(p.userId);
            return (
              <View key={`respond-${p.userId}`} style={[styles.respond, { backgroundColor: colors.accentSoft }]}>
                <AppText variant="caption">
                  {member?.isMe ? "Cet objectif vous attend." : `Pour ${member?.displayName ?? "ce profil"} :`} {METRICS[goal.metric].description}
                </AppText>
                <View style={styles.respondButtons}>
                  <Button title="Refuser" variant="ghost" size="md" onPress={() => onRespond(goal, p.userId, "declined")} />
                  <Button title="Accepter" size="md" onPress={() => onRespond(goal, p.userId, "accepted")} />
                </View>
              </View>
            );
          })
        : null}
    </Card>
  );
}

/** Choix d'un message d'encouragement prédéfini. */
export function EncourageSheet({
  name,
  visible,
  onClose,
  onPick,
}: {
  name: string;
  visible: boolean;
  onClose: () => void;
  onPick: (kind: EncouragementKind) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
      <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.lg }]}>
        <AppText variant="headline">Encourager {name}</AppText>
        {ENCOURAGEMENT_ORDER.map((kind) => (
          <Pressable
            key={kind}
            accessibilityRole="button"
            onPress={() => onPick(kind)}
            style={({ pressed }) => [styles.option, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
            <Ionicons name="heart" size={18} color={colors.accent} />
            <AppText>{ENCOURAGEMENTS[kind]}</AppText>
          </Pressable>
        ))}
        <Button title="Annuler" variant="ghost" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: { width: 36, height: 36, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  shared: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center" },
  check: { marginLeft: spacing.xs },
  member: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  encourage: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  respond: { borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  respondButtons: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm },
  chip: { flexDirection: "row", alignItems: "center", gap: spacing.xs, borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: spacing.lg, minHeight: 44 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { padding: spacing.xl, gap: spacing.md, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, minHeight: 52 },
});
