import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { BigButton, RoundButton } from "@/components/kids/KidButton";
import { ParentNote } from "@/components/kids/ParentNote";
import { RecitationRecorder } from "@/components/RecitationCheck";
import { SafeArea } from "@/components/SafeArea";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { errorMessage } from "@/lib/api";
import { useOneShot, useTrackQueue } from "@/lib/audio";
import { useAuth } from "@/lib/auth-store";
import { KID_TONES, KIDS, useKidsColors } from "@/lib/kids";
import { useCompleteMissionStep, useTodayMission } from "@/lib/missions";
import { KID_STEPS, versesLabel } from "@/lib/missions-format";
import { closeScreen } from "@/lib/navigation";
import { useChapterAudio, useRecitationAvailable, useVerse } from "@/lib/queries";
import { useRecitationCheck } from "@/lib/recitation";
import { radius, spacing, useColors } from "@/lib/theme";
import type { KidMission, MissionStep, RecitationCheck, VerseNote } from "@/lib/types";

/** Réciter au moins « difficile » (3) suffit ; après 3 essais, l'enfant passe quand même. */
const PASSING_QUALITY = 3;
const MAX_TRIES = 3;

/** La mission du jour, une étape après l'autre ; la dernière ouvre l'écran « Bravo ». */
export default function MissionScreen() {
  const today = useTodayMission();
  const complete = useCompleteMissionStep();
  const refetch = today.refetch;
  // Retour d'une séance de mémorisation ou de vocabulaire : l'étape faite est relue.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  const mission = today.data?.mission ?? null;

  useEffect(() => {
    if (mission?.completed) router.replace("/mission/bravo");
  }, [mission?.completed]);

  if (today.isPending) return <LoadingState label="Préparation de ta mission…" />;
  if (today.isError) return <ErrorState error={today.error} onRetry={() => void today.refetch()} />;
  if (!mission) {
    return (
      <SafeArea style={styles.flex}>
        <EmptyState icon="moon-outline" title="Pas de mission maintenant" message="Reviens sur l’accueil pour voir la suite." action={{ title: "Fermer", onPress: () => closeScreen("/") }} />
      </SafeArea>
    );
  }
  if (mission.completed) return <LoadingState />;

  const current = mission.steps.find((s) => !s.done) ?? mission.steps[0]!;
  const done = (step: MissionStep) =>
    complete.mutate(
      { planId: mission.planId, dayIndex: mission.dayIndex, step },
      { onError: (e) => Alert.alert("Étape non enregistrée", errorMessage(e), [{ text: "Réessayer", onPress: () => done(step) }, { text: "Plus tard", style: "cancel" }]) },
    );

  return <Runner key={current.kind} mission={mission} step={current.kind} onDone={() => done(current.kind)} saving={complete.isPending} />;
}

function Runner({ mission, step, onDone, saving }: { mission: KidMission; step: MissionStep; onDone: () => void; saving: boolean }) {
  const colors = useColors();
  const kc = useKidsColors();
  const position = mission.steps.findIndex((s) => s.kind === step);
  return (
    <SafeArea style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.top}>
        <RoundButton icon="arrow-back" label="Retour à l’accueil" onPress={() => closeScreen("/")} />
        <View style={styles.segments}>
          {mission.steps.map((s, i) => (
            <View key={s.kind} style={[styles.segment, { backgroundColor: s.done ? KID_TONES.green.main : i === position ? KIDS.sun : colors.border }]} />
          ))}
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="label" color={kc.tint("orange").ink}>
          Étape {position + 1} sur {mission.steps.length} · {versesLabel(mission.verses)}
        </AppText>
        {step === "listen" ? <ListenStep mission={mission} onDone={onDone} saving={saving} /> : null}
        {step === "repeat" ? <RepeatStep mission={mission} onDone={onDone} saving={saving} /> : null}
        {step === "memorize" ? (
          <OpenSessionStep
            title="Retiens le verset"
            text="Écoute, cache le texte, puis récite de mémoire. Tu peux t’aider des premiers mots."
            icon={KID_STEPS.memorize.icon}
            tone="blue"
            onPress={() =>
              router.push({ pathname: "/memorize/session", params: { keys: mission.verses.join(","), missionPlanId: mission.planId, missionDay: String(mission.dayIndex) } })
            }
          />
        ) : null}
        {step === "play" ? (
          <OpenSessionStep
            title="Joue avec les mots"
            text="Des petits jeux avec les mots du verset. Chaque mot trouvé rejoint « Mes mots »."
            icon={KID_STEPS.play.icon}
            tone="violet"
            onPress={() => {
              const [chapter, verse] = mission.verses[0]!.split(":");
              router.push({ pathname: "/learn/session", params: { chapterId: chapter!, verse: verse!, missionPlanId: mission.planId, missionDay: String(mission.dayIndex) } });
            }}
          />
        ) : null}
      </ScrollView>
    </SafeArea>
  );
}

// --- Écouter --------------------------------------------------------------------

function ListenStep({ mission, onDone, saving }: { mission: KidMission; onDone: () => void; saving: boolean }) {
  const colors = useColors();
  const recitationId = useAuth((s) => s.user?.recitationId ?? null);
  const chapterId = Number(mission.verses[0]!.split(":")[0]);
  const audio = useChapterAudio(chapterId, recitationId);
  const tracks = useMemo(
    () => (audio.data?.files ?? []).filter((f) => mission.verses.includes(f.verseKey)).map((f) => ({ key: f.verseKey, url: f.url, words: f.words })),
    [audio.data, mission.verses],
  );
  // « Lent » : la récitation à trois quarts de sa vitesse, pour suivre mot à mot.
  const [slow, setSlow] = useState(false);
  const queue = useTrackQueue(tracks, { autoAdvance: true, rate: slow ? 0.75 : 1 });
  const word = useOneShot();
  // Écouté jusqu'au bout : la file s'arrête après le dernier verset.
  const [heard, setHeard] = useState(false);
  const [previous, setPrevious] = useState<number | null>(null);
  if (queue.index !== previous) {
    if (previous === tracks.length - 1 && queue.index === null) setHeard(true);
    setPrevious(queue.index);
  }

  return (
    <View style={styles.step}>
      <AppText variant="display">Écoute bien</AppText>
      <AppText variant="bodyStrong" muted>
        Touche un mot pour l’entendre.
      </AppText>
      {mission.verses.map((key) => (
        <VerseWords key={key} verseKey={key} activeWord={queue.currentKey === key ? queue.currentWord : null} onWord={(url) => word.play(url)} note={mission.notes[key]} />
      ))}
      <View style={styles.playRow}>
        <BigButton title="Lent" size="md" tone={slow ? "green" : "white"} accessibilityLabel={slow ? "Vitesse normale" : "Écouter lentement"} onPress={() => setSlow((s) => !s)} />
        <View style={styles.playCenter}>
          {audio.isPending ? (
            <View style={[styles.playBig, { backgroundColor: colors.surfaceMuted }]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <RoundButton
              icon={queue.playing ? "pause" : "play"}
              label={queue.playing ? "Mettre en pause" : "Écouter le verset"}
              tone="green"
              size={104}
              disabled={tracks.length === 0}
              onPress={queue.toggle}
            />
          )}
          <AppText variant="bodyStrong" color={colors.primary}>
            {queue.playing ? "J’écoute…" : heard ? "Encore une fois ?" : "Écouter le verset"}
          </AppText>
        </View>
        <View style={styles.playSpacer} />
      </View>
      <BigButton title="J’ai bien écouté !" icon="checkmark" tone="sun" disabled={!heard || saving} onPress={onDone} />
      {!heard ? (
        <AppText variant="caption" muted center>
          Écoute le verset jusqu’au bout pour gagner ton étoile.
        </AppText>
      ) : null}
    </View>
  );
}

function VerseWords({ verseKey, activeWord, onWord, note }: { verseKey: string; activeWord: number | null; onWord: (url: string) => void; note?: VerseNote }) {
  const colors = useColors();
  const kc = useKidsColors();
  const translationId = useAuth((s) => s.user?.translationId ?? null);
  const verse = useVerse(verseKey, translationId);
  if (verse.isPending) return <ActivityIndicator color={colors.primary} />;
  if (!verse.data) return null;
  const words = verse.data.words.filter((w) => w.type === "word");
  return (
    <View style={[styles.verseCard, { backgroundColor: colors.surface }]}>
      <View style={styles.words}>
        {words.map((w) => {
          const active = activeWord === w.position;
          return (
            <Pressable
              key={w.location}
              accessibilityRole="button"
              accessibilityLabel={`Écouter le mot ${w.transliteration ?? ""}`}
              disabled={!w.audioUrl}
              onPress={() => w.audioUrl && onWord(w.audioUrl)}
              style={[styles.word, { backgroundColor: active ? kc.sunSoft : colors.background, borderBottomColor: active ? KIDS.sun : kc.edge }]}>
              <ArabicText size="lg">{w.textUthmani}</ArabicText>
              {w.transliteration ? (
                <AppText variant="bodyStrong" color={active ? kc.onSunSoft : colors.textMuted}>
                  {w.transliteration}
                </AppText>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {verse.data.translation ? (
        <View style={styles.meaning}>
          <AppText variant="label" color={colors.accent}>
            Ce que ça veut dire
          </AppText>
          <AppText variant="headline" center>
            {verse.data.translation.text}
          </AppText>
        </View>
      ) : null}
      {note ? <ParentNote note={note} /> : null}
    </View>
  );
}

// --- Répéter --------------------------------------------------------------------

function RepeatStep({ mission, onDone, saving }: { mission: KidMission; onDone: () => void; saving: boolean }) {
  const available = useRecitationAvailable();
  const target = mission.verses.length === 1 ? { verseKey: mission.verses[0]! } : { from: mission.verses[0]!, to: mission.verses.at(-1)! };
  const [tries, setTries] = useState(0);
  const [result, setResult] = useState<RecitationCheck | null>(null);
  const recorder = useRecitationCheck(target, (r) => {
    setTries((n) => n + 1);
    setResult(r);
  });
  const passed = (result?.suggestedQuality ?? 0) >= PASSING_QUALITY;
  const canGoOn = passed || tries >= MAX_TRIES || available.data === false;

  return (
    <View style={styles.step}>
      <AppText variant="display">Répète à voix haute</AppText>
      <AppText variant="bodyStrong" muted>
        {available.data === false ? "Récite le verset à voix haute, puis touche le bouton." : "Appuie sur le micro, récite le verset, puis arrête."}
      </AppText>
      {mission.verses.map((key) => (
        <VerseText key={key} verseKey={key} />
      ))}
      {available.data !== false ? (
        <RecitationRecorder state={recorder.state} seconds={recorder.seconds} onStart={() => void recorder.start()} onStop={() => void recorder.stopAndCheck()} onCancel={() => void recorder.cancel()} title="Réciter" />
      ) : null}
      {result ? (
        <AppText variant="headline" center>
          {passed ? "Bravo, c’est très bien récité !" : tries >= MAX_TRIES ? "Tu as bien travaillé, on continue !" : "Presque ! Essaie encore une fois."}
        </AppText>
      ) : null}
      <BigButton title={available.data === false ? "J’ai récité !" : "Continuer"} icon="checkmark" tone="sun" disabled={!canGoOn || saving} onPress={onDone} />
    </View>
  );
}

function VerseText({ verseKey }: { verseKey: string }) {
  const colors = useColors();
  const verse = useVerse(verseKey, null);
  return (
    <View style={[styles.verseCard, { backgroundColor: colors.surface }]}>
      {verse.data ? (
        <ArabicText size="xl" center>
          {verse.data.textUthmani}
        </ArabicText>
      ) : (
        <ActivityIndicator color={colors.primary} />
      )}
    </View>
  );
}

// --- Retenir et jouer : séances existantes ---------------------------------------

function OpenSessionStep({ title, text, icon, tone, onPress }: { title: string; text: string; icon: keyof typeof Ionicons.glyphMap; tone: "blue" | "violet"; onPress: () => void }) {
  const kc = useKidsColors();
  return (
    <View style={[styles.step, styles.center]}>
      <View style={[styles.bigIcon, { backgroundColor: kc.tint(tone).bg }]}>
        <Ionicons name={icon} size={56} color={KID_TONES[tone].main} />
      </View>
      <AppText variant="display" center>
        {title}
      </AppText>
      <AppText variant="bodyStrong" muted center>
        {text}
      </AppText>
      <View style={styles.stretch}>
        <BigButton title="C’est parti !" icon="play" onPress={onPress} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  segments: { flex: 1, flexDirection: "row", gap: 6 },
  segment: { flex: 1, height: 12, borderRadius: 6 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  step: { gap: spacing.lg },
  center: { alignItems: "center", paddingTop: spacing.xl },
  stretch: { alignSelf: "stretch" },
  verseCard: { borderRadius: radius.xl, padding: spacing.lg, gap: spacing.lg },
  words: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm },
  word: { minWidth: 74, alignItems: "center", borderRadius: radius.lg, borderBottomWidth: 4, paddingHorizontal: spacing.md, paddingTop: 2, paddingBottom: spacing.sm },
  meaning: { alignItems: "center", gap: 4 },
  playRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.lg, paddingVertical: spacing.sm },
  playCenter: { alignItems: "center", gap: spacing.sm },
  playSpacer: { minWidth: 78 },
  playBig: { width: 104, height: 104, borderRadius: 52, alignItems: "center", justifyContent: "center" },
  bigIcon: { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center" },
});
