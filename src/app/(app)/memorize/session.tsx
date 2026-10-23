import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ARABIC_MAX_FONT_SCALE } from "@/components/ArabicText";
import { SafeArea } from "@/components/SafeArea";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { RecitationRecorder, RecitationSummary, useStatusColors } from "@/components/RecitationCheck";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { errorMessage } from "@/lib/api";
import { useTrackQueue } from "@/lib/audio";
import { BigButton } from "@/components/kids/KidsHome";
import { KIDS, KIDS_MAX_DUE_VERSES, useKidsMode } from "@/lib/kids";
import { formatRate, usePlayback } from "@/lib/playback-store";
import { verseTransliteration } from "@/lib/quran-text";
import { useRecitationCheck } from "@/lib/recitation";
import {
  useChapter,
  useChapterAudio,
  useDueVerses,
  useMe,
  useOfflineChapter,
  usePlan,
  useProgramAction,
  useRecitationAvailable,
  useReviewVerse,
  useVerse,
  useWeakWords,
} from "@/lib/queries";
import { fonts, radius, spacing, useColors } from "@/lib/theme";
import type { Word } from "@/lib/types";
import { closeScreen } from "@/lib/navigation";
import { useCompleteMissionStep } from "@/lib/missions";

const MAX_NEW_VERSES = 5;
type HideLevel = 0 | 1 | 2;
const HIDE_LABELS: Record<HideLevel, string> = { 0: "Texte", 1: "Indices", 2: "Masqué" };
/** Qualité SM-2 : 1 = oublié (le verset revient en fin de séance), 3 à 5 = réussi. */
const GRADES = [
  { quality: 1, label: "Oublié", icon: "refresh" as const },
  { quality: 3, label: "Difficile", icon: "alert-circle-outline" as const },
  { quality: 4, label: "Bien", icon: "checkmark" as const },
  { quality: 5, label: "Parfait", icon: "star" as const },
];
/** Profil enfant : trois choix simples au lieu de quatre notes. */
const KIDS_GRADES = [
  { quality: 1, label: "Pas encore", icon: "refresh" as const },
  { quality: 3, label: "Presque", icon: "thumbs-up-outline" as const },
  { quality: 5, label: "Je sais !", icon: "star" as const },
];

/** Première lettre d'un mot, avec ses signes, pour l'indice de récitation. */
function firstLetter(text: string): string {
  const chars = [...text];
  const start = chars.findIndex((c) => /[ء-يٱ]/.test(c));
  if (start < 0) return text;
  let end = start + 1;
  while (end < chars.length && /[ً-ٰٟۖ-ۭ]/.test(chars[end]!)) end++;
  return `${chars.slice(0, end).join("")}…`;
}

export default function MemorizationSession() {
  const params = useLocalSearchParams<{
    planId?: string;
    verse?: string;
    due?: string;
    keys?: string;
    programId?: string;
    day?: string;
    missionPlanId?: string;
    missionDay?: string;
  }>();
  const programAction = useProgramAction(params.programId ?? "");
  const missionStep = useCompleteMissionStep();
  const plan = usePlan(params.planId ?? "");
  const due = useDueVerses();
  const kids = useKidsMode();

  const keys = useMemo<string[] | null>(() => {
    // Étape d'un programme guidé : les versets du jour.
    if (params.keys) return params.keys.split(",").filter((k) => /^\d{1,3}:\d{1,3}$/.test(k));
    // Enfant : des séances courtes ; le reste des révisions attend la prochaine.
    if (params.due) return due.data ? due.data.slice(0, kids ? KIDS_MAX_DUE_VERSES : due.data.length).map((v) => v.key) : null;
    if (!plan.data) return null;
    if (params.verse) return [`${plan.data.chapterId}:${params.verse}`];
    const dueKeys = plan.data.verses.filter((v) => v.due).map((v) => v.key);
    const fresh = plan.data.verses.filter((v) => v.status === "new").slice(0, MAX_NEW_VERSES).map((v) => v.key);
    const selection = [...dueKeys, ...fresh];
    return selection.length > 0 ? selection : plan.data.verses.map((v) => v.key);
    // La sélection est figée au démarrage de la séance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.due ? due.isSuccess : plan.isSuccess]);

  // Journée du programme : si le serveur ne répond pas (hors ligne), on le dit et on propose de réessayer.
  const completeDay = (day: number) =>
    programAction.mutate(
      { type: "complete", day },
      {
        onError: (error) =>
          Alert.alert("Journée non validée", errorMessage(error), [
            { text: "Plus tard", style: "cancel" },
            { text: "Réessayer", onPress: () => completeDay(day) },
          ]),
      },
    );

  const source = params.due ? due : plan;
  if (!params.keys && source.isError) return <ErrorState error={source.error} onRetry={() => closeScreen("/memorize")} />;
  if (!keys) return <LoadingState label="Préparation de la séance…" />;
  if (keys.length === 0) {
    return (
      <SafeArea style={{ flex: 1 }}>
        <EmptyState icon="checkmark-done" title="Tout est à jour" message="Aucun verset à réviser pour le moment." action={{ title: "Fermer", onPress: () => closeScreen("/memorize") }} />
      </SafeArea>
    );
  }
  return (
    <SessionRunner
      keys={keys}
      onFinished={() => {
        if (params.programId && params.day) completeDay(Number(params.day));
        // Étape « Retenir » de la mission du jour d'un enfant.
        if (params.missionPlanId && params.missionDay) {
          missionStep.mutate(
            { planId: params.missionPlanId, dayIndex: Number(params.missionDay), step: "memorize" },
            { onError: (error) => Alert.alert("Étape non enregistrée", errorMessage(error)) },
          );
        }
      }}
    />
  );
}

function SessionRunner({ keys: initialKeys, onFinished }: { keys: string[]; onFinished: () => void }) {
  const colors = useColors();
  // Un verset oublié est remis en fin de séance : il est retravaillé avant « Séance terminée ».
  const [keys, setKeys] = useState(initialKeys);
  const [index, setIndex] = useState(0);
  const [xp, setXp] = useState(0);
  const [finished, setFinished] = useState(false);
  const retried = useRef(new Set<string>());
  const kids = useKidsMode();

  if (finished && kids) {
    return (
      <SafeArea style={[styles.flex, styles.done, { backgroundColor: colors.background }]}>
        <View style={styles.kidsStars}>
          {[64, 88, 64].map((size, i) => (
            <Ionicons key={i} name="star" size={size} color={KIDS.sun} />
          ))}
        </View>
        <AppText variant="display" center>
          Bravo !
        </AppText>
        <AppText variant="bodyStrong" muted center>
          Tu as travaillé {initialKeys.length} verset{initialKeys.length > 1 ? "s" : ""}. Ils reviendront pour que tu ne les oublies pas.
        </AppText>
        <View style={styles.kidsCta}>
          <BigButton title="Terminer" icon="checkmark" onPress={() => closeScreen("/memorize")} />
        </View>
      </SafeArea>
    );
  }

  if (finished) {
    return (
      <SafeArea style={[styles.flex, styles.done, { backgroundColor: colors.background }]}>
        <View style={[styles.trophy, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="ribbon" size={56} color={colors.accent} />
        </View>
        <AppText variant="display" center>
          Séance terminée
        </AppText>
        <AppText muted center>
          {initialKeys.length} verset{initialKeys.length > 1 ? "s" : ""} travaillé{initialKeys.length > 1 ? "s" : ""} · +{xp} XP
        </AppText>
        <AppText muted center>
          Les prochaines révisions sont planifiées selon votre auto-évaluation : 1 jour, puis 6, puis 2 à 3 semaines. Un verset est « solide » à partir de la 4ᵉ réussite.
        </AppText>
        <Button title="Terminer" onPress={() => closeScreen("/memorize")} style={{ alignSelf: "stretch" }} />
      </SafeArea>
    );
  }

  return (
    <SafeArea style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quitter"
          hitSlop={10}
          onPress={() =>
            Alert.alert("Quitter la séance ?", "Les versets déjà évalués restent enregistrés.", [
              { text: "Continuer", style: "cancel" },
              { text: "Quitter", style: "destructive", onPress: () => closeScreen("/memorize") },
            ])
          }>
          <Ionicons name="close" size={28} color={colors.textMuted} />
        </Pressable>
        <View style={styles.flex}>
          <ProgressBar value={index / keys.length} height={kids ? 12 : 6} color={kids ? KIDS.sun : colors.accent} />
        </View>
        <AppText variant="caption" muted>
          {index + 1}/{keys.length}
        </AppText>
      </View>
      <VerseDrill
        key={keys[index]}
        verseKey={keys[index]!}
        onDone={(gained, forgotten) => {
          setXp((x) => x + gained);
          const key = keys[index]!;
          let next = keys;
          // Oublié : une seule reprise par verset, pour que la séance se termine.
          if (forgotten && !retried.current.has(key)) {
            retried.current.add(key);
            next = [...keys, key];
            setKeys(next);
          }
          if (index + 1 < next.length) setIndex(index + 1);
          else {
            setFinished(true);
            onFinished();
          }
        }}
      />
    </SafeArea>
  );
}

function VerseDrill({ verseKey, onDone }: { verseKey: string; onDone: (xp: number, forgotten: boolean) => void }) {
  const colors = useColors();
  const kids = useKidsMode();
  const grades = kids ? KIDS_GRADES : GRADES;
  const me = useMe();
  const [chapterId, verseNumber] = verseKey.split(":").map(Number) as [number, number];
  const verse = useVerse(verseKey, me.data?.translationId ?? null);
  const audio = useChapterAudio(chapterId, me.data?.recitationId ?? null);
  const offline = useOfflineChapter(chapterId);
  const review = useReviewVerse();
  const [repeat, setRepeat] = useState(3);
  const [hide, setHide] = useState<HideLevel>(0);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [stage, setStage] = useState<"study" | "recite" | "grade">("study");
  const [showTranslation, setShowTranslation] = useState(false);
  const [showTransliteration, setShowTransliteration] = useState(true);

  // Sourate téléchargée : audio local (même récitateur) et texte de secours sans réseau.
  const offlineAudio =
    offline.data && (me.data?.recitationId == null || me.data.recitationId === offline.data.recitationId || audio.isError)
      ? offline.data.audio
      : undefined;
  const audioFile = (offlineAudio ?? audio.data)?.files.find((f) => f.verseKey === verseKey);
  const url = audioFile?.url;
  const timings = audioFile?.words;
  const verseData = verse.data ?? (verse.isError ? offline.data?.verses.find((v) => v.key === verseKey) : undefined);
  const tracks = useMemo(() => (url ? [{ key: verseKey, url, words: timings }] : []), [url, verseKey, timings]);
  const rate = usePlayback((p) => p.rate);
  const cycleRate = usePlayback((p) => p.cycleRate);
  const chapter = useChapter(chapterId);
  const surahName = chapter.data?.nameSimple ?? `Sourate ${chapterId}`;
  const nowPlaying = useCallback(
    () => ({ title: `${surahName} · verset ${verseNumber}`, artist: "Mémorisation", albumTitle: "Eqra" }),
    [surahName, verseNumber],
  );
  const player = useTrackQueue(tracks, { repeat, autoAdvance: false, rate, nowPlaying });
  const recitationAvailable = useRecitationAvailable();
  // Vérification terminée : le verset réapparaît, mots oubliés et différents surlignés.
  const check = useRecitationCheck({ verseKey }, () => setStage("grade"));
  const weakWords = useWeakWords(Boolean(recitationAvailable.data));
  const weak = useMemo(() => new Set(weakWords.data?.filter((w) => w.verseKey === verseKey).map((w) => w.location)), [weakWords.data, verseKey]);
  const statusColors = useStatusColors();
  const result = check.state.phase === "done" ? check.state.result : null;
  const statusByLocation = useMemo(() => new Map(result?.words.map((w) => [w.location, w.status])), [result]);
  const busy = check.state.phase === "recording" || check.state.phase === "checking";

  if (!verseData && verse.isError) return <ErrorState error={verse.error} onRetry={() => void verse.refetch()} />;
  if (!verseData) return <LoadingState />;
  const words = verseData.words.filter((w) => w.type === "word");
  const effectiveHide: HideLevel = stage === "recite" ? 2 : stage === "grade" ? 0 : hide;
  // La phonétique accompagne le texte visible ; elle disparaît dès qu'on masque pour réciter.
  const transliteration = showTransliteration && effectiveHide === 0 ? verseTransliteration(verseData) : null;

  function renderWord(word: Word) {
    const visible = effectiveHide === 0 || revealed.has(word.location);
    const recited = player.currentWord === word.position;
    const text = visible ? word.textUthmani : effectiveHide === 1 ? firstLetter(word.textUthmani) : "";
    const tone = stage === "grade" ? statusColors(statusByLocation.get(word.location)) : null;
    // Mot souvent oublié : souligné en ocre pendant l'étude.
    const fragile = stage === "study" && visible && weak.has(word.location);
    return (
      <Pressable
        key={word.location}
        accessibilityRole="button"
        accessibilityLabel={visible ? word.textUthmani : "Mot masqué, toucher pour révéler"}
        onPress={() => setRevealed((r) => new Set(r).add(word.location))}
        style={[
          styles.word,
          !visible && { backgroundColor: colors.surfaceMuted, minWidth: effectiveHide === 2 ? 56 : undefined },
          recited && { backgroundColor: colors.accentSoft },
          tone && { backgroundColor: tone.background },
          fragile && { borderBottomWidth: 3, borderBottomColor: colors.accent },
        ]}>
        <AppText
          maxFontSizeMultiplier={ARABIC_MAX_FONT_SCALE}
          style={{
            fontFamily: fonts.arabic,
            fontSize: 30,
            lineHeight: 56,
            color: tone ? tone.text : recited && visible ? colors.accent : visible ? colors.arabic : colors.textMuted,
          }}>
          {text || " "}
        </AppText>
      </Pressable>
    );
  }

  return (
    <View style={styles.body}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="label" muted>
          Sourate {chapterId} · verset {verseNumber}
        </AppText>
        <Card style={styles.verseCard}>
          <View style={styles.words}>{words.map(renderWord)}</View>
          {transliteration ? (
            <AppText italic color={colors.accent} style={styles.transliteration}>
              {transliteration}
            </AppText>
          ) : null}
          {showTranslation && verseData.translation ? (
            <AppText muted style={[styles.translation, { borderTopColor: colors.border }]}>
              {verseData.translation.text}
            </AppText>
          ) : null}
        </Card>

        {stage === "study" ? (
          <>
            {weak.size > 0 ? (
              <AppText variant="caption" color={colors.accent}>
                Les mots soulignés sont ceux que vous avez oubliés lors de vos dernières vérifications à la voix.
              </AppText>
            ) : null}
            <View style={[styles.segmented, { backgroundColor: colors.surfaceMuted }]}>
              {([0, 1, 2] as HideLevel[]).map((level) => (
                <Pressable
                  key={level}
                  accessibilityRole="button"
                  accessibilityLabel={HIDE_LABELS[level]}
                  accessibilityState={{ selected: hide === level }}
                  onPress={() => {
                    setHide(level);
                    setRevealed(new Set());
                  }}
                  style={[styles.segment, hide === level && { backgroundColor: colors.surface }]}>
                  <AppText variant="bodyStrong" color={hide === level ? colors.primary : colors.textMuted}>
                    {HIDE_LABELS[level]}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <Card style={styles.audioCard}>
              <View style={styles.audioRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={player.playing ? "Pause" : "Écouter le verset"}
                  disabled={!url}
                  onPress={() => (player.index === null ? player.playAt(0) : player.toggle())}
                  style={[styles.play, { backgroundColor: url ? colors.primary : colors.border }]}>
                  {audio.isPending && !url ? (
                    <ActivityIndicator color={colors.onPrimary} />
                  ) : (
                    <Ionicons name={player.playing ? "pause" : "play"} size={24} color={colors.onPrimary} />
                  )}
                </Pressable>
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{kids ? "Écoute et répète" : "Écouter et répéter"}</AppText>
                  <AppText variant="caption" muted>
                    {player.index !== null ? `Écoute ${player.plays}/${repeat}` : "Récitation verset par verset"}
                  </AppText>
                </View>
              </View>
              {kids ? null : (
              <View style={styles.audioRow}>
                <AppText variant="caption" muted style={styles.flex}>
                  Répétitions et vitesse
                </AppText>
                {[1, 3, 5].map((n) => (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    accessibilityLabel={`Répéter ${n} fois`}
                    accessibilityState={{ selected: repeat === n }}
                    hitSlop={6}
                    onPress={() => setRepeat(n)}
                    style={[styles.repeat, { borderColor: repeat === n ? colors.primary : colors.border, backgroundColor: repeat === n ? colors.primarySoft : "transparent" }]}>
                    <AppText variant="caption" color={repeat === n ? colors.primary : colors.textMuted}>
                      ×{n}
                    </AppText>
                  </Pressable>
                ))}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Vitesse ${formatRate(rate)}, toucher pour changer`}
                  hitSlop={6}
                  onPress={cycleRate}
                  style={[styles.repeat, { borderColor: rate === 1 ? colors.border : colors.accent, backgroundColor: rate === 1 ? "transparent" : colors.accentSoft }]}>
                  <AppText variant="caption" color={rate === 1 ? colors.textMuted : colors.accent}>
                    {formatRate(rate)}
                  </AppText>
                </Pressable>
              </View>
              )}
            </Card>

            <View style={styles.links}>
              <Pressable accessibilityRole="button" onPress={() => setShowTransliteration((s) => !s)} style={styles.link}>
                <AppText variant="bodyStrong" color={colors.primary}>
                  {showTransliteration ? "Masquer la phonétique" : "Afficher la phonétique"}
                </AppText>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setShowTranslation((s) => !s)} style={styles.link}>
                <AppText variant="bodyStrong" color={colors.primary}>
                  {showTranslation ? "Masquer la traduction" : "Afficher la traduction"}
                </AppText>
              </Pressable>
            </View>
          </>
        ) : null}

        {stage === "recite" ? (
          <>
            <Card tone="accent">
              <AppText variant="bodyStrong">{kids ? "Récite le verset de mémoire" : "Récitez le verset de mémoire"}</AppText>
              <AppText muted>{kids ? "Touche un mot si tu bloques." : "À voix basse ou à voix haute. Touchez un mot pour le révéler si vous bloquez."}</AppText>
            </Card>
            {recitationAvailable.data ? (
              <RecitationRecorder
                state={check.state}
                seconds={check.seconds}
                onStart={() => {
                  player.stop();
                  void check.start();
                }}
                onStop={() => void check.stopAndCheck()}
                onCancel={() => void check.cancel()}
              />
            ) : null}
          </>
        ) : null}

        {stage === "grade" && result ? <RecitationSummary result={result} /> : null}
      </ScrollView>

      {stage === "study" ? (
        <Button
          title={kids ? "Je suis prêt !" : "Je suis prêt à réciter"}
          icon="mic-outline"
          onPress={() => {
            player.stop();
            setRevealed(new Set());
            setStage("recite");
          }}
        />
      ) : stage === "recite" ? (
        busy ? null : <Button title={kids ? "Voir le verset" : "Vérifier"} icon="eye-outline" onPress={() => setStage("grade")} />
      ) : (
        <View style={styles.grades}>
          <AppText variant="headline" center>
            {kids ? "Tu as réussi ?" : "Comment s’est passée la récitation ?"}
          </AppText>
          {kids ? null : (
            <AppText variant="caption" muted center>
              « Oublié » : le verset revient en fin de séance. Réussi : prochaine révision dans 1 jour, puis 6, puis 2 à 3 semaines.
            </AppText>
          )}
          {result?.suggestedQuality && !kids ? (
            <AppText variant="caption" muted center>
              Note proposée d’après la vérification : à vous de confirmer.
            </AppText>
          ) : null}
          <View style={styles.gradeRow}>
            {grades.map((g) => (
              <Pressable
                key={g.quality}
                accessibilityRole="button"
                disabled={review.isPending}
                onPress={() =>
                  review.mutate(
                    { chapterId, verseNumber, quality: g.quality },
                    {
                      onSuccess: (r) => {
                        void Haptics.notificationAsync(
                          g.quality >= 3 ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
                        );
                        onDone(r.xpGained, g.quality < 3);
                      },
                      onError: () => Alert.alert("Enregistrement impossible", "Vérifiez votre connexion puis réessayez."),
                    },
                  )
                }
                style={({ pressed }) => [
                  styles.grade,
                  { borderColor: colors.border, backgroundColor: colors.surface, transform: [{ scale: pressed ? 0.96 : 1 }] },
                  result?.suggestedQuality === g.quality && { borderColor: colors.accent, borderWidth: 2, backgroundColor: colors.accentSoft },
                ]}>
                <Ionicons name={g.icon} size={kids ? 34 : 22} color={g.quality < 3 ? colors.danger : g.quality === 5 ? colors.accent : colors.primary} />
                <AppText variant={kids ? "bodyStrong" : "caption"}>{g.label}</AppText>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  kidsStars: { flexDirection: "row", alignItems: "flex-end" },
  kidsCta: { alignSelf: "stretch" },
  topBar: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  body: { flex: 1, padding: spacing.lg, gap: spacing.md },
  scroll: { gap: spacing.lg, paddingBottom: spacing.lg },
  verseCard: { gap: spacing.md },
  words: { flexDirection: "row-reverse", flexWrap: "wrap", columnGap: spacing.sm, rowGap: spacing.xs },
  word: { borderRadius: radius.sm, paddingHorizontal: 4, alignItems: "center" },
  translation: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md },
  segmented: { flexDirection: "row", borderRadius: radius.pill, padding: 4 },
  segment: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: radius.pill },
  audioCard: { gap: spacing.md },
  audioRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  play: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  repeat: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, minHeight: 34, justifyContent: "center" },
  transliteration: { fontSize: 15, lineHeight: 23 },
  links: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", columnGap: spacing.lg },
  link: { alignSelf: "center", paddingHorizontal: spacing.xs, minHeight: 44, justifyContent: "center" },
  grades: { gap: spacing.md },
  gradeRow: { flexDirection: "row", gap: spacing.sm },
  grade: { flex: 1, alignItems: "center", gap: 6, paddingVertical: spacing.lg, borderRadius: radius.lg, borderWidth: 1 },
  done: { padding: spacing.xl, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  trophy: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
});
