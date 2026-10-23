import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ProgressBar } from "@/components/ProgressBar";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { localDay } from "@/lib/families-format";
import { useMissionChildren } from "@/lib/missions";
import { planTitle, todayLine } from "@/lib/missions-format";
import { useChapters } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import type { MissionChild } from "@/lib/types";

/** Missions des enfants : ce que chaque enfant du compte a à faire, et où il en est. */
export default function MissionChildren() {
  const children = useMissionChildren();

  if (children.isPending) return <LoadingState />;
  if (children.isError) return <ErrorState error={children.error} onRetry={() => void children.refetch()} />;
  if (children.data.length === 0) {
    return (
      <EmptyState
        icon="happy-outline"
        title="Aucun profil enfant"
        message="Créez un profil enfant sur ce compte : vous pourrez ensuite lui préparer des missions."
        action={{ title: "Profils de la famille", onPress: () => router.push("/profiles/manage") }}
      />
    );
  }

  return (
    <Screen edges={[]} onRefresh={() => void children.refetch()} refreshing={children.isRefetching}>
      <AppText muted>Préparez une mission : votre enfant la trouve chaque jour sur son accueil, étape par étape.</AppText>
      {children.data.map((child) => (
        <ChildCard key={child.id} child={child} />
      ))}
    </Screen>
  );
}

function ChildCard({ child }: { child: MissionChild }) {
  const colors = useColors();
  const chapters = useChapters();
  const plan = child.plan;
  return (
    <Card style={styles.card} onPress={plan ? () => router.push({ pathname: "/missions/[id]", params: { id: plan.id } }) : undefined}>
      <View style={styles.header}>
        <ProfileAvatar name={child.displayName} avatar={child.avatar} size={44} />
        <View style={styles.flex}>
          <AppText variant="headline">{child.displayName}</AppText>
          <View style={styles.stars}>
            <Ionicons name="star" size={14} color={colors.accent} />
            <AppText variant="caption" muted>
              {child.stars.last7Days} cette semaine · {child.stars.total} au total
            </AppText>
          </View>
        </View>
        {plan ? <Ionicons name="chevron-forward" size={18} color={colors.textFaint} /> : null}
      </View>
      {child.sharedAt ? (
        <View style={[styles.shared, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="heart" size={16} color={colors.accent} />
          <AppText variant="caption" color={colors.accent} style={styles.flex}>
            {child.displayName} vous l’a dit : mission du jour réussie !
          </AppText>
        </View>
      ) : null}

      {plan ? (
        <View style={styles.plan}>
          <AppText variant="bodyStrong">{planTitle(plan, chapters.data)}</AppText>
          <ProgressBar value={plan.totalDays ? plan.completedDays / plan.totalDays : 0} />
          <AppText variant="caption" muted>
            {todayLine(plan.today, plan.totalDays, localDay())}
          </AppText>
        </View>
      ) : (
        <View style={styles.plan}>
          <AppText muted>Pas de mission en cours.</AppText>
          <Button title="Préparer une mission" icon="add" size="md" onPress={() => router.push({ pathname: "/missions/new", params: { childId: child.id } })} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stars: { flexDirection: "row", alignItems: "center", gap: 4 },
  plan: { gap: spacing.sm },
  shared: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
});
