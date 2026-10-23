import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Card } from "@/components/Card";
import { BigButton } from "@/components/kids/KidsHome";
import { ProgressBar } from "@/components/ProgressBar";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/States";
import { KIDS, useKidsColors } from "@/lib/kids";
import { useChapters, useDueVerses, usePlans } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import type { MemorizationPlan } from "@/lib/types";

/**
 * Onglet Réciter d'un profil enfant : les versets à revoir aujourd'hui, ses sourates par cœur et
 * la récitation au micro. Ni carte de mémorisation, ni programmes, ni détail des plans.
 */
export function KidsRecite() {
  const colors = useColors();
  const kc = useKidsColors();
  const plans = usePlans();
  const due = useDueVerses();
  const chapters = useChapters();
  const refetchPlans = plans.refetch;
  const refetchDue = due.refetch;
  // Retour d'une séance : les versets dus et la progression sont relus.
  useFocusEffect(
    useCallback(() => {
      void refetchPlans();
      void refetchDue();
    }, [refetchPlans, refetchDue]),
  );

  if (plans.isPending) return <LoadingState />;
  if (plans.isError) return <ErrorState error={plans.error} onRetry={() => void plans.refetch()} />;
  const name = (id: number) => chapters.data?.find((c) => c.id === id)?.nameSimple ?? `Sourate ${id}`;
  const dueCount = due.data?.length ?? 0;
  const dueNames = [...new Set((due.data ?? []).map((v) => v.chapterId))].slice(0, 3).map(name).join(" · ");
  const latest = plans.data[0];

  return (
    <Screen
      refreshing={plans.isRefetching}
      onRefresh={() => {
        void plans.refetch();
        void due.refetch();
      }}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="display">Réciter</AppText>
          <AppText variant="bodyStrong" muted>
            Apprends tes sourates par cœur.
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Apprendre une nouvelle sourate"
          onPress={() => router.push("/memorize/new")}
          style={[styles.add, { backgroundColor: colors.hero }]}>
          <Ionicons name="add" size={30} color={KIDS.onHero} />
        </Pressable>
      </View>

      {dueCount > 0 ? (
        <Card tone="primary" style={styles.due}>
          <View>
            <AppText variant="label" color={KIDS.sun}>
              À revoir aujourd’hui
            </AppText>
            <AppText variant="title" color={KIDS.onHero}>
              {dueCount} verset{dueCount > 1 ? "s t’attendent" : " t’attend"}
            </AppText>
            {dueNames ? (
              <AppText color={KIDS.onHero} style={styles.soft}>
                {dueNames}
              </AppText>
            ) : null}
          </View>
          <BigButton title="Réviser" icon="play" onPress={() => router.push({ pathname: "/memorize/session", params: { due: "1" } })} />
        </Card>
      ) : plans.data.length > 0 ? (
        <Card tone="primary" style={styles.done}>
          <Ionicons name="star" size={44} color={KIDS.sun} />
          <View style={styles.flex}>
            <AppText variant="title" color={KIDS.onHero}>
              Tout est révisé !
            </AppText>
            <AppText color={KIDS.onHero} style={styles.soft}>
              Reviens demain pour la suite.
            </AppText>
          </View>
        </Card>
      ) : null}

      <AppText variant="title">Mes sourates par cœur</AppText>
      {plans.data.length === 0 ? (
        <Card style={styles.empty}>
          <Ionicons name="sparkles" size={40} color={KIDS.sunStroke} />
          <AppText variant="headline" center>
            Choisis ta première sourate
          </AppText>
          <BigButton title="Choisir" icon="add" onPress={() => router.push("/memorize/new")} />
        </Card>
      ) : (
        plans.data.map((plan) => <PlanRow key={plan.id} plan={plan} name={name(plan.chapterId)} arabic={chapters.data?.find((c) => c.id === plan.chapterId)?.nameArabic} />)
      )}

      {latest ? (
        <Card
          tone="flat"
          style={[styles.mic, { backgroundColor: kc.sunSoft }]}
          onPress={() =>
            router.push({ pathname: "/memorize/recite", params: { chapterId: String(latest.chapterId), from: String(latest.fromVerse), to: String(latest.toVerse) } })
          }>
          <View style={[styles.micIcon, { backgroundColor: colors.hero }]}>
            <Ionicons name="mic" size={28} color={KIDS.onHero} />
          </View>
          <View style={styles.flex}>
            <AppText variant="headline" color={kc.onSunSoft}>
              Réciter au micro
            </AppText>
            <AppText color={kc.onSunSoft}>Récite {name(latest.chapterId)}, Eqra t’écoute.</AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={kc.onSunSoft} />
        </Card>
      ) : null}
    </Screen>
  );
}

function PlanRow({ plan, name, arabic }: { plan: MemorizationPlan; name: string; arabic?: string }) {
  const colors = useColors();
  const kc = useKidsColors();
  const { total, solid } = plan.progress;
  const known = total > 0 && solid >= total;
  return (
    <Card
      onPress={() => router.push({ pathname: "/memorize/session", params: { planId: plan.id } })}
      style={styles.plan}
      accessibilityLabel={`${name} : ${known ? "connue par cœur" : `${solid} versets sur ${total}`}, s’entraîner`}>
      <View style={[styles.badge, { backgroundColor: known ? kc.sunSoft : colors.primarySoft }]}>
        {known ? (
          <Ionicons name="star" size={28} color={KIDS.sun} />
        ) : (
          <AppText variant="bodyStrong" color={colors.primary}>
            {solid}/{total}
          </AppText>
        )}
      </View>
      <View style={[styles.flex, styles.planText]}>
        <AppText variant="headline" numberOfLines={1}>
          {name}
        </AppText>
        <ProgressBar value={total ? solid / total : 0} color={known ? KIDS.sun : colors.primary} height={8} />
        <AppText variant="caption" muted>
          {known ? "Je la connais par cœur" : `${solid} verset${solid > 1 ? "s" : ""} sur ${total} · on continue`}
        </AppText>
      </View>
      {arabic ? <ArabicText size="sm">{arabic}</ArabicText> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  soft: { opacity: 0.85 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  add: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  due: { gap: spacing.lg, borderRadius: radius.xl },
  done: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderRadius: radius.xl },
  empty: { alignItems: "center", gap: spacing.md },
  plan: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  planText: { gap: 4 },
  badge: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  mic: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  micIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
});
