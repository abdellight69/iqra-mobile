import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { RoundButton } from "@/components/kids/KidButton";
import { ParentNote } from "@/components/kids/ParentNote";
import { PrayerHint } from "@/components/kids/PrayerHint";
import { SafeArea } from "@/components/SafeArea";
import { ErrorState, LoadingState } from "@/components/States";
import { useOneShot, useTrackQueue } from "@/lib/audio";
import { playKidSound } from "@/lib/kid-sounds";
import { KID_TONES, KIDS, useKidsColors } from "@/lib/kids";
import { kidPhonetic, useFinishedSurahs } from "@/lib/kids-quran";
import { useVerseNotes } from "@/lib/missions";
import { BASMALA, showsBasmala } from "@/lib/quran-text";
import { useChapter, useChapterAudio, useMe, useRecordReading, useSaveReadingPosition, useVerses } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import type { Verse } from "@/lib/types";

/** Vitesse « Plus lent » ; « Répéter » rejoue chaque verset trois fois. */
const SLOW_RATE = 0.75;
const REPEATS = 3;

/**
 * Lecteur d'un profil enfant : un verset à la fois, en grand, chaque mot à toucher pour l'entendre,
 * la phonétique (bouton « Aide ») et le sens en une phrase. Trois gros boutons et deux réglages.
 */
export function KidsReader() {
  const colors = useColors();
  const kc = useKidsColors();
  const params = useLocalSearchParams<{ id: string; verse?: string }>();
  const chapterId = Number(params.id);
  const me = useMe();
  const chapter = useChapter(chapterId);
  const verses = useVerses(chapterId, me.data?.translationId ?? null);
  const audio = useChapterAudio(chapterId, me.data?.recitationId ?? null);
  const savePosition = useSaveReadingPosition();
  const recordReading = useRecordReading();
  const { markFinished } = useFinishedSurahs(me.data?.id);
  const word = useOneShot();

  const [index, setIndex] = useState(() => Math.max(0, (params.verse ? Number(params.verse) : 1) - 1));
  const [help, setHelp] = useState(true);
  const [slow, setSlow] = useState(false);
  const [repeat, setRepeat] = useState(false);

  const loaded = useMemo(() => verses.data?.pages.flatMap((p) => p.verses) ?? [], [verses.data]);
  const tracks = useMemo(() => (audio.data?.files ?? []).map((f) => ({ key: f.verseKey, url: f.url, words: f.words })), [audio.data]);
  // Écran verrouillé et centre de contrôle : le verset en cours, comme dans le lecteur adulte.
  const surahName = chapter.data?.nameSimple;
  const nowPlaying = useCallback(
    (track: { key: string }) => ({ title: `${surahName ?? `Sourate ${chapterId}`} · verset ${track.key.split(":")[1]}`, artist: "Récitation du Coran", albumTitle: "Eqra" }),
    [surahName, chapterId],
  );
  const queue = useTrackQueue(tracks, { autoAdvance: false, rate: slow ? SLOW_RATE : 1, repeat: repeat ? REPEATS : 1, nowPlaying });

  // Versets vus et dernier verset, enregistrés en quittant l'écran (comme le lecteur adulte).
  const seen = useRef(new Set<number>());
  const last = useRef<number | null>(null);
  useFocusEffect(
    useCallback(
      () => () => {
        if (last.current) savePosition.mutate({ chapterId, verseNumber: last.current });
        if (seen.current.size > 0) recordReading.mutate(seen.current.size);
        seen.current = new Set();
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [chapterId],
    ),
  );

  const total = chapter.data?.versesCount ?? loaded.length;
  const verse = loaded[index];
  const verseNumber = verse?.verseNumber;
  useEffect(() => {
    if (!verseNumber) return;
    seen.current.add(verseNumber);
    last.current = verseNumber;
  }, [verseNumber]);
  // Versets chargés par pages de 20 : la suivante arrive avant d'en avoir besoin.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = verses;
  useEffect(() => {
    if (index >= loaded.length - 2 && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [index, loaded.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (verses.isError) return <ErrorState error={verses.error} onRetry={() => void verses.refetch()} />;
  if (!verse || !chapter.data) return <LoadingState label="Ouverture de la sourate…" />;

  const isLast = index >= total - 1;
  const playing = queue.playing && queue.currentKey === verse.key;
  const go = (next: number) => {
    queue.stop();
    playKidSound("tap");
    setIndex(next);
  };

  return (
    <SafeArea style={[styles.flex, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.top}>
        <RoundButton icon="arrow-back" label="Retour aux sourates" onPress={() => router.back()} />
        <View style={styles.title}>
          <AppText variant="headline" numberOfLines={1}>
            {chapter.data.nameSimple}
          </AppText>
          <ArabicText size="sm" color={colors.textMuted}>
            {chapter.data.nameArabic}
          </ArabicText>
        </View>
        <Pill label="Aide" on={help} onPress={() => setHelp(!help)} accessibilityLabel="Aide à la lecture : phonétique sous les mots" />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <PrayerHint chapterId={chapterId} />
        <View style={styles.progress}>
          {total <= 30 ? (
            <View style={styles.dots}>
              {Array.from({ length: total }, (_, i) => (
                <View key={i} style={[styles.dot, { backgroundColor: i < index ? KID_TONES.blue.main : i === index ? KIDS.sun : colors.border }]} />
              ))}
            </View>
          ) : null}
          <AppText variant="bodyStrong" color={kc.tint("blue").ink} center>
            Verset {verse.verseNumber} sur {total}
          </AppText>
        </View>

        {index === 0 && showsBasmala(chapterId) ? (
          <ArabicText size="md" center color={colors.textMuted}>
            {BASMALA}
          </ArabicText>
        ) : null}

        <VerseView verse={verse} help={help} activeWord={queue.currentKey === verse.key ? queue.currentWord : null} onWord={(url) => word.play(url)} />
      </ScrollView>

      <View style={styles.controls}>
        <View style={styles.buttons}>
          <RoundButton icon="chevron-back" label="Verset précédent" size={64} disabled={index === 0} onPress={() => go(index - 1)} />
          {audio.isPending ? (
            <View style={[styles.play, { backgroundColor: colors.surfaceMuted }]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <RoundButton
              icon={playing ? "pause" : "play"}
              label={playing ? "Mettre en pause" : "Écouter le verset"}
              tone="blue"
              size={104}
              disabled={tracks.length === 0}
              onPress={() => (queue.currentKey === verse.key ? queue.toggle() : queue.playKey(verse.key))}
            />
          )}
          {isLast ? (
            <RoundButton
              icon="checkmark"
              label="Sourate finie, retour aux sourates"
              tone="sun"
              size={64}
              onPress={() => {
                queue.stop();
                markFinished(chapterId);
                router.back();
              }}
            />
          ) : (
            <RoundButton icon="chevron-forward" label="Verset suivant" size={64} onPress={() => go(index + 1)} />
          )}
        </View>
        <AppText variant="bodyStrong" color={kc.tint("blue").ink} center>
          {playing ? "J’écoute…" : isLast ? "Dernier verset : touche ✓ quand tu as fini" : "Écoute, puis passe au verset suivant"}
        </AppText>
        <View style={styles.pills}>
          <Pill label="Plus lent" on={slow} onPress={() => setSlow(!slow)} />
          <Pill label={`Répéter ${REPEATS} fois`} on={repeat} onPress={() => setRepeat(!repeat)} />
        </View>
      </View>
    </SafeArea>
  );
}

function VerseView({ verse, help, activeWord, onWord }: { verse: Verse; help: boolean; activeWord: number | null; onWord: (url: string) => void }) {
  const colors = useColors();
  const kc = useKidsColors();
  const notes = useVerseNotes([verse.key]);
  const note = notes.data?.[verse.key];
  // La traduction du profil, telle quelle (plus de reformulation « en mots d'enfant »).
  const meaning = verse.translation?.text ?? null;
  const words = verse.words.filter((w) => w.type === "word");
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <AppText variant="bodyStrong" muted center>
        Touche un mot pour l’entendre
      </AppText>
      <View style={styles.words}>
        {words.map((w) => {
          const active = activeWord === w.position;
          const phonetic = help ? kidPhonetic(w) : null;
          return (
            <Pressable
              key={w.location}
              accessibilityRole="button"
              accessibilityLabel={`Écouter le mot ${phonetic ?? ""}`}
              disabled={!w.audioUrl}
              onPress={() => w.audioUrl && onWord(w.audioUrl)}
              style={[styles.word, { backgroundColor: active ? kc.sunSoft : colors.background, borderBottomColor: active ? KIDS.sun : kc.edge }]}>
              <ArabicText size="xl">{w.textUthmani}</ArabicText>
              {phonetic ? (
                <AppText variant="bodyStrong" color={active ? kc.onSunSoft : colors.textMuted}>
                  {phonetic}
                </AppText>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {meaning ? (
        <View style={[styles.meaning, { borderColor: colors.surfaceMuted }]}>
          <AppText variant="label" color={colors.accent}>
            Traduction
          </AppText>
          <AppText variant="headline" center>
            {meaning}
          </AppText>
        </View>
      ) : null}
      {note ? <ParentNote note={note} /> : null}
    </View>
  );
}

function Pill({ label, on, onPress, accessibilityLabel }: { label: string; on: boolean; onPress: () => void; accessibilityLabel?: string }) {
  const colors = useColors();
  const kc = useKidsColors();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: on ? KID_TONES.green.main : colors.surface, borderBottomColor: on ? KID_TONES.green.edge : kc.edge, borderBottomWidth: pressed ? 1 : 4, marginTop: pressed ? 3 : 0 },
      ]}>
      <AppText variant="bodyStrong" color={on ? KIDS.onHero : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  title: { flex: 1, alignItems: "center" },
  content: { padding: spacing.lg, gap: spacing.lg },
  progress: { gap: spacing.sm },
  dots: { flexDirection: "row", gap: 4 },
  dot: { flex: 1, height: 10, borderRadius: 5 },
  card: { borderRadius: radius.xl, padding: spacing.lg, gap: spacing.lg },
  words: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm },
  word: { minWidth: 72, alignItems: "center", borderRadius: radius.lg, borderBottomWidth: 4, paddingHorizontal: spacing.md, paddingTop: 2, paddingBottom: spacing.sm },
  meaning: { alignItems: "center", gap: 4, borderTopWidth: 2, paddingTop: spacing.md },
  controls: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  buttons: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xl },
  play: { width: 104, height: 104, borderRadius: 52, alignItems: "center", justifyContent: "center" },
  pills: { flexDirection: "row", justifyContent: "center", gap: spacing.sm + 2 },
  pill: { minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
});
