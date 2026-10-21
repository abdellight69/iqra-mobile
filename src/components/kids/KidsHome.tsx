import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Card } from "@/components/Card";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Screen } from "@/components/Screen";
import { VoicePlayButton } from "@/components/VoiceNote";
import { localDay } from "@/lib/families-format";
import { KIDS } from "@/lib/kids";
import { useLearnedWords, useTodayMission } from "@/lib/missions";
import { dayLabel, KID_STEPS, kidMissionTitle, versesLabel } from "@/lib/missions-format";
import { useChapters, useMe } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import type { KidMission, KidToday } from "@/lib/types";

/**
 * Accueil d'un profil enfant : la mission du jour préparée par un parent, son mot, les étoiles et
 * « Mes mots ». Peu de choses, de grands boutons, et chaque consigne peut s'écouter.
 */
export function KidsHome() {
  const colors = useColors();
  const me = useMe();
  const today = useTodayMission();
  const words = useLearnedWords();
  const refetch = today.refetch;
  // Retour d'une mission ou d'une séance : la mission du jour et les étoiles sont relues.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  return (
    <Screen
      refreshing={today.isRefetching}
      onRefresh={() => {
        void today.refetch();
        void words.refetch();
      }}>
      <View style={styles.header}>
        <ProfileAvatar name={me.data?.displayName ?? "?"} avatar={me.data?.avatar} size={56} />
        <View style={styles.flex}>
          <AppText muted>As-salâmou ʿalaykoum</AppText>
          <AppText variant="title">{me.data?.displayName ?? ""}</AppText>
        </View>
        <View style={[styles.starPill, { backgroundColor: colors.surface }]} accessibilityLabel={`${today.data?.totalStars ?? 0} étoiles`}>
          <Ionicons name="star" size={24} color={KIDS.sun} />
          <AppText variant="headline">{today.data?.totalStars ?? 0}</AppText>
        </View>
      </View>

      {today.data?.mission ? <MissionCard mission={today.data.mission} /> : <NoMission today={today.data} loading={today.isPending} />}

      <Card onPress={() => router.push("/mes-mots")} style={styles.words}>
        <View style={[styles.wordsIcon, { backgroundColor: KIDS.sunSoft }]}>
          <Ionicons name="albums" size={30} color={KIDS.sunStroke} />
        </View>
        <View style={styles.flex}>
          <AppText variant="headline">Mes mots</AppText>
          <AppText muted>
            {words.data?.length ? `${words.data.length} mot${words.data.length > 1 ? "s" : ""} appris` : "Tes mots appris arrivent ici"}
          </AppText>
        </View>
        {words.data?.[0]?.headword ? <ArabicText size="md">{words.data[0].headword}</ArabicText> : null}
        <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
      </Card>
    </Screen>
  );
}

function MissionCard({ mission }: { mission: KidMission }) {
  const colors = useColors();
  const chapters = useChapters();
  const started = mission.stars > 0;
  return (
    <Card tone="primary" style={styles.mission}>
      <View style={styles.flex}>
        <AppText variant="label" color={KIDS.sun}>
          Ta mission du jour
        </AppText>
        <AppText variant="title" color={colors.onPrimary}>
          {kidMissionTitle(mission.title, mission.verses, chapters.data)}
        </AppText>
        <AppText color={colors.onPrimary} style={styles.soft}>
          {versesLabel(mission.verses)} · jour {mission.dayIndex} sur {mission.totalDays}
        </AppText>
      </View>

      {mission.message ? (
        <View style={[styles.bubble, { backgroundColor: colors.surface }]}>
          <AppText variant="bodyStrong">Un message de {mission.message.authorName ?? "ta famille"}</AppText>
          {mission.message.audioId ? <VoicePlayButton id={mission.message.audioId} label={`Écouter le message de ${mission.message.authorName ?? "ta famille"}`} /> : null}
          {mission.message.text ? <AppText>{mission.message.text}</AppText> : null}
        </View>
      ) : null}

      <View style={styles.steps}>
        {mission.steps.map((step) => (
          <View key={step.kind} style={[styles.step, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
            <View style={[styles.stepIcon, { backgroundColor: colors.surface }]}>
              <Ionicons name={KID_STEPS[step.kind].icon} size={26} color={colors.primary} />
            </View>
            <AppText variant="bodyStrong" color={colors.onPrimary}>
              {KID_STEPS[step.kind].label}
            </AppText>
            <Ionicons
              name={step.done ? "star" : "star-outline"}
              size={22}
              color={step.done ? KIDS.sun : "rgba(255,255,255,0.55)"}
              accessibilityLabel={step.done ? "Étape réussie" : "Étape à faire"}
            />
          </View>
        ))}
      </View>

      <BigButton
        icon={mission.completed ? "trophy" : "play"}
        title={mission.completed ? "Mission réussie !" : started ? "On continue !" : "C’est parti !"}
        onPress={() => router.push(mission.completed ? "/mission/bravo" : "/mission")}
      />
    </Card>
  );
}

function NoMission({ today, loading }: { today: KidToday | undefined; loading: boolean }) {
  if (loading || !today) return null;
  const next = today.nextMissionOn ? dayLabel(today.nextMissionOn, localDay()) : null;
  const content = {
    no_plan: { icon: "gift-outline", title: "Pas encore de mission", text: "Demande à Papa ou Maman de te préparer une mission." },
    rest_day: { icon: "moon-outline", title: "Pas de mission aujourd’hui", text: next ? `Repose-toi bien, la prochaine mission arrive ${next} !` : "Repose-toi bien !" },
    not_started: { icon: "hourglass-outline", title: "Ta mission arrive bientôt", text: next ? `Elle commence ${next}.` : "Elle commence bientôt." },
    paused: { icon: "pause-circle-outline", title: "Ta mission est en pause", text: "Tu peux lire le Coran ou revoir tes mots en attendant." },
    finished: { icon: "trophy-outline", title: "Bravo, mission terminée !", text: "Demande une nouvelle mission à Papa ou Maman." },
  } as const;
  const c = content[today.reason ?? "no_plan"];
  return (
    <Card style={styles.none}>
      <Ionicons name={c.icon} size={48} color={KIDS.sunStroke} />
      <AppText variant="title" center>
        {c.title}
      </AppText>
      <AppText muted center>
        {c.text}
      </AppText>
    </Card>
  );
}

/** Grand bouton jaune des écrans enfant. */
export function BigButton({ title, icon, onPress, disabled }: { title: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.big, { backgroundColor: KIDS.sun, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }]}>
      {icon ? <Ionicons name={icon} size={24} color={KIDS.sunInk} /> : null}
      <AppText variant="headline" color={KIDS.sunInk}>
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm },
  starPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  mission: { gap: spacing.lg, borderRadius: radius.xl },
  soft: { opacity: 0.85 },
  bubble: { borderRadius: radius.lg, borderBottomLeftRadius: 6, padding: spacing.md, gap: spacing.sm },
  steps: { flexDirection: "row", gap: spacing.sm },
  step: { flex: 1, alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.lg },
  stepIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  big: { minHeight: 62, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.xl },
  none: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxl },
  words: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  wordsIcon: { width: 56, height: 56, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
});
