import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, type ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Card } from "@/components/Card";
import { BigButton, RoundButton } from "@/components/kids/KidButton";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Screen } from "@/components/Screen";
import { localDay } from "@/lib/families-format";
import { KID_TONES, KIDS, useKidsColors, type KidTone } from "@/lib/kids";
import { useLearnedWords, useTodayMission } from "@/lib/missions";
import { dayLabel, KID_STEPS, kidMissionTitle, versesLabel } from "@/lib/missions-format";
import { useChapters, useMe } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import type { KidMission, KidToday } from "@/lib/types";
import { useVoiceNotePlayer } from "@/lib/voice-note";

type IconName = ComponentProps<typeof Ionicons>["name"];

/**
 * Accueil d'un profil enfant : la mission du jour préparée par un parent (ses trois étapes, le
 * message de la famille), les étoiles, puis deux portes : « Mes mots » et le Coran.
 */
export function KidsHome() {
  const colors = useColors();
  const kc = useKidsColors();
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
  const name = me.data?.displayName ?? "";
  const count = words.data?.length ?? 0;

  return (
    <Screen
      refreshing={today.isRefetching}
      onRefresh={() => {
        void today.refetch();
        void words.refetch();
      }}>
      <View style={styles.header}>
        <View style={[styles.avatarRing, { backgroundColor: colors.surface }]}>
          <ProfileAvatar name={name || "?"} avatar={me.data?.avatar} size={48} />
        </View>
        <View style={styles.flex}>
          <AppText variant="title" numberOfLines={2}>
            Salam, {name} !
          </AppText>
          <AppText variant="caption" muted>
            {today.data?.mission ? "On fait ta mission ?" : "Bienvenue !"}
          </AppText>
        </View>
        <View style={[styles.starPill, { backgroundColor: kc.sunSoft }]} accessibilityLabel={`${today.data?.totalStars ?? 0} étoiles`}>
          <Ionicons name="star" size={24} color={KIDS.sun} />
          <AppText variant="headline" color={kc.onSunSoft}>
            {today.data?.totalStars ?? 0}
          </AppText>
        </View>
      </View>

      {today.data?.mission ? <MissionCard mission={today.data.mission} /> : <NoMission today={today.data} loading={today.isPending} />}

      <View style={styles.tiles}>
        <Tile
          tone="violet"
          icon="albums"
          title="Mes mots"
          subtitle={count ? `${count} mot${count > 1 ? "s" : ""} appris` : "Tes mots appris"}
          arabic={words.data?.[0]?.headword}
          onPress={() => router.push("/mes-mots")}
        />
        <Tile tone="orange" icon="book" title="Le Coran" subtitle="Petites sourates" arabic="النَّاس" onPress={() => router.push("/quran")} />
      </View>
    </Screen>
  );
}

function MissionCard({ mission }: { mission: KidMission }) {
  const colors = useColors();
  const kc = useKidsColors();
  const chapters = useChapters();
  const started = mission.stars > 0;
  const currentIndex = mission.steps.findIndex((s) => !s.done);
  return (
    <Card style={styles.mission}>
      <View>
        <AppText variant="label" color={colors.accent}>
          Ta mission du jour
        </AppText>
        <AppText variant="title">{kidMissionTitle(mission.title, mission.verses, chapters.data)}</AppText>
        <AppText variant="caption" muted>
          {versesLabel(mission.verses)} · jour {mission.dayIndex} sur {mission.totalDays}
        </AppText>
      </View>

      <View style={styles.steps}>
        <View pointerEvents="none" style={[styles.stepsLine, { backgroundColor: colors.surfaceMuted }]} />
        {mission.steps.map((step, i) => {
          // Étape faite : verte ; en cours : jaune ; à venir : grise.
          const current = i === currentIndex;
          const bg = step.done ? KID_TONES.green.main : current ? KID_TONES.sun.main : kc.neutral;
          const edge = step.done ? KID_TONES.green.edge : current ? KID_TONES.sun.edge : kc.edge;
          const ink = step.done ? KIDS.onHero : current ? KIDS.sunInk : kc.neutralInk;
          return (
            <View key={step.kind} style={styles.step} accessibilityLabel={`${KID_STEPS[step.kind].label} : ${step.done ? "réussi" : current ? "à faire maintenant" : "à venir"}`}>
              <View style={[styles.stepOuter, { backgroundColor: edge }]}>
                <View style={[styles.stepInner, { backgroundColor: bg }]}>
                  <Ionicons name={step.done ? "checkmark" : KID_STEPS[step.kind].icon} size={30} color={ink} />
                </View>
              </View>
              <AppText variant="bodyStrong" color={step.done || current ? colors.text : kc.neutralInk}>
                {KID_STEPS[step.kind].label}
              </AppText>
            </View>
          );
        })}
      </View>

      {mission.message ? <MessageRow message={mission.message} /> : null}

      <BigButton
        icon={mission.completed ? "trophy" : "play"}
        title={mission.completed ? "Mission réussie !" : started ? "On continue !" : "C’est parti !"}
        onPress={() => router.push(mission.completed ? "/mission/bravo" : "/mission")}
      />
    </Card>
  );
}

/** Le mot laissé par un parent : son initiale, et un bouton pour l'écouter quand c'est un vocal. */
function MessageRow({ message }: { message: NonNullable<KidMission["message"]> }) {
  const colors = useColors();
  const kc = useKidsColors();
  const player = useVoiceNotePlayer();
  const name = message.authorName ?? "ta famille";
  const blue = kc.tint("blue");
  const playing = message.audioId !== null && player.playingId === message.audioId;
  const hint = message.text ?? (message.audioId ? (playing ? "Lecture…" : "Touche pour l’écouter") : "");
  return (
    <View style={[styles.message, { backgroundColor: blue.bg }]}>
      <View style={[styles.messageAvatar, { backgroundColor: KID_TONES.violet.main }]} aria-hidden>
        <AppText variant="headline" color={KIDS.onHero}>
          {name.charAt(0).toUpperCase()}
        </AppText>
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          Un message de {name}
        </AppText>
        {hint ? (
          <AppText variant="caption" color={blue.ink} numberOfLines={3}>
            {hint}
          </AppText>
        ) : null}
        {message.audioId && player.error ? (
          <AppText variant="caption" color={colors.danger}>
            {player.error}
          </AppText>
        ) : null}
      </View>
      {message.audioId ? (
        <RoundButton
          icon={playing ? "pause" : "play"}
          label={playing ? "Mettre en pause" : `Écouter le message de ${name}`}
          tone="blue"
          size={44}
          onPress={() => void player.toggle(message.audioId!)}
        />
      ) : null}
    </View>
  );
}

function NoMission({ today, loading }: { today: KidToday | undefined; loading: boolean }) {
  const kc = useKidsColors();
  if (loading || !today) return null;
  const next = today.nextMissionOn ? dayLabel(today.nextMissionOn, localDay()) : null;
  const content: Record<NonNullable<KidToday["reason"]>, { icon: IconName; tone: KidTone; title: string; text: string }> = {
    no_plan: { icon: "gift", tone: "violet", title: "Pas encore de mission", text: "Demande à Papa ou Maman de te préparer une mission." },
    rest_day: { icon: "moon", tone: "blue", title: "Pas de mission aujourd’hui", text: next ? `Repose-toi bien, la prochaine mission arrive ${next} !` : "Repose-toi bien !" },
    not_started: { icon: "hourglass", tone: "orange", title: "Ta mission arrive bientôt", text: next ? `Elle commence ${next}.` : "Elle commence bientôt." },
    paused: { icon: "pause", tone: "blue", title: "Ta mission est en pause", text: "Tu peux lire le Coran ou revoir tes mots en attendant." },
    finished: { icon: "trophy", tone: "sun", title: "Bravo, mission terminée !", text: "Demande une nouvelle mission à Papa ou Maman." },
  };
  const c = content[today.reason ?? "no_plan"];
  const tint = kc.tint(c.tone);
  return (
    <Card style={styles.none}>
      <View style={[styles.noneIcon, { backgroundColor: tint.bg }]}>
        <Ionicons name={c.icon} size={44} color={KID_TONES[c.tone].main} />
      </View>
      <AppText variant="title" center>
        {c.title}
      </AppText>
      <AppText muted center>
        {c.text}
      </AppText>
    </Card>
  );
}

/** Porte pastel vers une autre partie de l'app. */
function Tile({ tone, icon, title, subtitle, arabic, onPress }: { tone: KidTone; icon: IconName; title: string; subtitle: string; arabic?: string | null; onPress: () => void }) {
  const kc = useKidsColors();
  const tint = kc.tint(tone);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { backgroundColor: tint.bg, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
      <View style={styles.tileTop}>
        <View style={[styles.tileIcon, { backgroundColor: KID_TONES[tone].main }]}>
          <Ionicons name={icon} size={22} color={KIDS.onHero} />
        </View>
        {arabic ? (
          <ArabicText size="md" color={tint.ink}>
            {arabic}
          </ArabicText>
        ) : null}
      </View>
      <View>
        <AppText variant="headline">{title}</AppText>
        <AppText variant="caption" muted numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatarRing: { padding: 4, borderRadius: 28 },
  starPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: spacing.sm + 2, paddingRight: spacing.md + 2, paddingVertical: spacing.sm, borderRadius: radius.pill },
  mission: { gap: spacing.lg, borderRadius: radius.xl },
  steps: { flexDirection: "row", gap: spacing.sm },
  stepsLine: { position: "absolute", left: "18%", right: "18%", top: 32, height: 4, borderRadius: 2 },
  step: { flex: 1, alignItems: "center", gap: spacing.sm },
  stepOuter: { width: 64, height: 69, borderRadius: 32, alignItems: "center" },
  stepInner: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  message: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2, borderRadius: radius.lg, padding: spacing.sm, paddingLeft: spacing.sm + 2 },
  messageAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  none: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxl },
  noneIcon: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  tiles: { flexDirection: "row", gap: spacing.md },
  tile: { flex: 1, minHeight: 124, borderRadius: 24, padding: spacing.lg, justifyContent: "space-between", gap: spacing.md },
  tileTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tileIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
