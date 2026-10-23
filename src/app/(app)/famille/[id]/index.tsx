import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EncourageSheet, FamilyGoalCard } from "@/components/FamilyGoalCard";
import { IconButton } from "@/components/IconButton";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { SupporterBadge } from "@/components/SupporterBadge";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { ErrorState, LoadingState } from "@/components/States";
import { errorMessage } from "@/lib/api";
import { useEncourage, useFamily, useMarkEncouragementsSeen, useRespondGoal } from "@/lib/families";
import { ENCOURAGEMENTS, localDay, SHARING } from "@/lib/families-format";
import { KID_TONES, useKidsColors } from "@/lib/kids";
import { radius, spacing, useColors } from "@/lib/theme";
import type { FamilyMember } from "@/lib/types";

/** Une famille : objectifs de la période, réponses en attente, encouragements et membres. */
export default function FamilyScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const kc = useKidsColors();
  const family = useFamily(id);
  const respond = useRespondGoal(id);
  const encourage = useEncourage(id);
  const markSeen = useMarkEncouragementsSeen(id);
  const [target, setTarget] = useState<{ member: FamilyMember; goalId?: string } | null>(null);
  const unseen = family.data?.unseenEncouragements ?? 0;

  // Les encouragements reçus sont marqués comme vus une fois l’écran ouvert.
  useEffect(() => {
    if (unseen > 0 && !markSeen.isPending) markSeen.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unseen]);

  if (family.isPending) return <LoadingState />;
  if (family.isError) return <ErrorState error={family.error} onRetry={() => void family.refetch()} />;
  const f = family.data;
  const today = localDay();
  const byId = new Map(f.members.map((m) => [m.userId, m]));
  const me = f.members.find((m) => m.isMe);
  const received = f.encouragements.filter((e) => byId.get(e.toUserId)?.isMine).slice(0, 5);

  return (
    <>
      <Stack.Screen
        options={{
          title: f.name,
          headerRight: f.isChild
            ? undefined
            : () => (
                <IconButton
                  icon="settings-outline"
                  label="Ma participation et réglages de la famille"
                  onPress={() => router.push({ pathname: "/famille/[id]/partage", params: { id } })}
                />
              ),
        }}
      />
      <Screen edges={[]} onRefresh={() => void family.refetch()} refreshing={family.isRefetching}>
        {received.length > 0 ? (
          <Card tone="accent" style={[styles.encouragements, f.isChild && { backgroundColor: kc.tint("pink").bg }]}>
            {f.isChild ? (
              <AppText variant="label" color={kc.tint("pink").ink}>
                Pour toi
              </AppText>
            ) : null}
            {received.map((e) => (
              <View key={e.id} style={styles.encouragement}>
                <Ionicons name="heart" size={f.isChild ? 22 : 16} color={f.isChild ? KID_TONES.pink.main : colors.accent} />
                <AppText style={styles.flex}>
                  <AppText variant="bodyStrong">{byId.get(e.fromUserId)?.displayName ?? "Un membre"}</AppText>
                  {byId.get(e.toUserId)?.isMe ? "" : ` à ${byId.get(e.toUserId)?.displayName}`} : {ENCOURAGEMENTS[e.kind]}
                </AppText>
              </View>
            ))}
          </Card>
        ) : null}

        <SectionHeader title="Objectifs" />
        {f.goals.length === 0 ? (
          <AppText muted>
            {f.isChild ? "Pas encore d’objectif dans cette famille." : "Aucun objectif pour l’instant. Proposez-en un : chaque personne concernée l’accepte ou le refuse."}
          </AppText>
        ) : (
          f.goals.map((goal) => (
            <FamilyGoalCard
              key={goal.id}
              goal={goal}
              members={f.members}
              today={today}
              onRespond={
                f.isChild
                  ? undefined
                  : (g, userId, status) =>
                      respond.mutate(
                        { goalId: g.id, status, userId: byId.get(userId)?.isMe ? undefined : userId },
                        { onError: (error) => Alert.alert("Réponse non enregistrée", errorMessage(error)) },
                      )
              }
              onEncourage={(g, member) => setTarget({ member, goalId: g.id })}
            />
          ))
        )}
        {f.isChild ? null : (
          <Button title="Proposer un objectif" icon="add" variant="secondary" onPress={() => router.push({ pathname: "/famille/[id]/objectif", params: { id } })} />
        )}

        <SectionHeader title={`Membres · ${f.members.length}`} />
        <Card padded={false}>
          {f.members.map((m, i) => (
            <Pressable
              key={m.userId}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: "/famille/[id]/membre/[userId]", params: { id, userId: m.userId } })}
              style={({ pressed }) => [
                styles.member,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                { opacity: pressed ? 0.6 : 1 },
              ]}>
              <ProfileAvatar name={m.displayName} avatar={m.avatar} size={36} />
              <View style={styles.flex}>
                <View style={styles.name}>
                  <AppText variant="bodyStrong" style={styles.flexShrink}>
                    {m.displayName}
                    {m.isMe ? " (moi)" : ""}
                  </AppText>
                  {m.supporter ? <SupporterBadge /> : null}
                </View>
                <AppText variant="caption" muted>
                  {[m.role === "admin" ? "Administrateur" : null, m.isChild ? "Profil enfant" : null, `Partage : ${SHARING[m.sharing].label.toLowerCase()}`]
                    .filter(Boolean)
                    .join(" · ")}
                </AppText>
              </View>
              {!m.isMe ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Encourager ${m.displayName}`}
                  hitSlop={8}
                  onPress={() => setTarget({ member: m })}
                  style={[styles.heart, { backgroundColor: f.isChild ? kc.tint("pink").bg : colors.accentSoft }]}>
                  <Ionicons name={f.isChild ? "heart" : "heart-outline"} size={f.isChild ? 22 : 18} color={f.isChild ? KID_TONES.pink.main : colors.accent} />
                </Pressable>
              ) : null}
            </Pressable>
          ))}
        </Card>

        {f.myRole === "admin" && !f.isChild ? (
          <Button title="Inviter quelqu’un" icon="person-add-outline" onPress={() => router.push({ pathname: "/famille/[id]/inviter", params: { id } })} />
        ) : null}
        {me && !f.isChild ? (
          <AppText variant="caption" faint center>
            Vous partagez : {SHARING[me.sharing].label.toLowerCase()}. Réglable dans les réglages de la famille, en haut à droite.
          </AppText>
        ) : null}
      </Screen>

      <EncourageSheet
        name={target?.member.displayName ?? ""}
        visible={target !== null}
        onClose={() => setTarget(null)}
        onPick={(kind) => {
          if (!target) return;
          encourage.mutate(
            { toUserId: target.member.userId, kind, goalId: target.goalId },
            {
              onSuccess: () => Alert.alert("Encouragement envoyé", `${target.member.displayName} le verra en ouvrant la famille.`),
              onError: (error) => Alert.alert("Encouragement non envoyé", errorMessage(error)),
            },
          );
          setTarget(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  name: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  encouragements: { gap: spacing.sm },
  encouragement: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  member: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  heart: { width: 40, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
});
