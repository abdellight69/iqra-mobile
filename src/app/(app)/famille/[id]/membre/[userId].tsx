import { router, Stack, useLocalSearchParams } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { StatTile } from "@/components/StatTile";
import { SupporterBadge } from "@/components/SupporterBadge";
import { ErrorState, LoadingState } from "@/components/States";
import { errorMessage } from "@/lib/api";
import { useFamily, useFamilyMemberStats, useRemoveMember, useUpdateMember } from "@/lib/families";
import { SHARING } from "@/lib/families-format";
import { radius, spacing, useColors } from "@/lib/theme";
import type { FamilyMember } from "@/lib/types";

/** Un membre : ses statistiques s’il les partage ; rôle et retrait pour les administrateurs. */
export default function MemberScreen() {
  const { id, userId } = useLocalSearchParams<{ id: string; userId: string }>();
  const family = useFamily(id);
  const update = useUpdateMember(id);
  const remove = useRemoveMember(id);

  if (family.isPending) return <LoadingState />;
  if (family.isError) return <ErrorState error={family.error} onRetry={() => void family.refetch()} />;
  const f = family.data;
  const member = f.members.find((m) => m.userId === userId);
  if (!member) return <ErrorState error={new Error("Membre introuvable")} />;
  const admin = f.myRole === "admin" && !f.isChild;

  return (
    <>
      <Stack.Screen options={{ title: member.displayName }} />
      <Screen edges={[]}>
        <View style={styles.header}>
          <ProfileAvatar name={member.displayName} avatar={member.avatar} size={64} />
          <AppText variant="title">{member.displayName}</AppText>
          {member.supporter ? <SupporterBadge /> : null}
          <AppText muted>
            {[member.role === "admin" ? "Administrateur" : "Membre", member.isChild ? "profil enfant" : null, `partage : ${SHARING[member.sharing].label.toLowerCase()}`]
              .filter(Boolean)
              .join(" · ")}
          </AppText>
        </View>

        {member.statsVisible ? <MemberStats familyId={id} member={member} /> : <AppText muted center>{member.displayName} ne partage pas ses statistiques complètes.</AppText>}

        {admin && !member.isMe ? (
          <View style={styles.actions}>
            <SectionHeader title="Administration" />
            {member.isChild ? null : (
              <Button
                title={member.role === "admin" ? "Retirer le rôle d’administrateur" : "Nommer administrateur"}
                variant="secondary"
                loading={update.isPending}
                onPress={() =>
                  update.mutate(
                    { userId: member.userId, role: member.role === "admin" ? "member" : "admin" },
                    { onError: (error) => Alert.alert("Non modifié", errorMessage(error)) },
                  )
                }
              />
            )}
            <Button
              title="Retirer de la famille"
              variant="danger"
              loading={remove.isPending}
              onPress={() =>
                Alert.alert(`Retirer ${member.displayName} ?`, "Sa progression personnelle n’est pas touchée.", [
                  { text: "Annuler", style: "cancel" },
                  { text: "Retirer", style: "destructive", onPress: () => remove.mutate(member.userId, { onSuccess: () => router.back() }) },
                ])
              }
            />
          </View>
        ) : null}
      </Screen>
    </>
  );
}

function MemberStats({ familyId, member }: { familyId: string; member: FamilyMember }) {
  const colors = useColors();
  const stats = useFamilyMemberStats(familyId, member.userId);
  if (stats.isPending) return <LoadingState />;
  if (stats.isError) return <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />;
  const s = stats.data;
  return (
    <>
      <View style={styles.tiles}>
        <StatTile value={s.currentStreak} label="jours de suite" />
        <StatTile value={s.wordsLearned} label="mots appris" />
        <StatTile value={s.versesMemorized} label="versets mémorisés" />
      </View>
      <View style={styles.tiles}>
        <StatTile value={s.xp} label="XP au total" />
        <StatTile value={s.versesSolid} label="versets solides" />
        <StatTile value={s.longestStreak} label="meilleure série" />
      </View>
      <Card style={styles.weeks}>
        <AppText variant="label" muted>
          Jours de pratique, 4 dernières semaines
        </AppText>
        <View style={styles.bars}>
          {s.weeks.map((w) => (
            <View key={w.weekStart} style={styles.bar}>
              <View style={[styles.barTrack, { backgroundColor: colors.surfaceMuted }]}>
                <View style={[styles.barFill, { height: `${(w.activeDays / 7) * 100}%`, backgroundColor: colors.primary }]} />
              </View>
              <AppText variant="caption">{w.activeDays}/7</AppText>
              <AppText variant="caption" muted>
                {new Date(`${w.weekStart}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              </AppText>
            </View>
          ))}
        </View>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", gap: spacing.xs, marginBottom: spacing.md },
  tiles: { flexDirection: "row", gap: spacing.md },
  weeks: { gap: spacing.md },
  bars: { flexDirection: "row", justifyContent: "space-around" },
  bar: { alignItems: "center", gap: spacing.xs },
  barTrack: { width: 28, height: 80, borderRadius: radius.sm, justifyContent: "flex-end", overflow: "hidden" },
  barFill: { width: "100%", borderRadius: radius.sm },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
});
