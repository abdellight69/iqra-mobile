import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useTrackQueue } from "@/lib/audio";
import { useAuth } from "@/lib/auth-store";
import { useChapterAudio, useChapterComprehension, useChapters, useKnownWords, useVerse } from "@/lib/queries";
import { fonts, radius, spacing, useColors } from "@/lib/theme";
import type { ChapterComprehension, LearningSession, SessionResult } from "@/lib/types";
import { AppText } from "../AppText";
import { ArabicText } from "../ArabicText";
import { Button } from "../Button";
import { Card } from "../Card";
import { ProgressRing } from "../ProgressRing";
import { SafeArea } from "../SafeArea";

/** Versets relus en fin de séance au plus : au-delà, on garde ceux des mots appris. */
const MAX_REVIEW_VERSES = 3;

export function chapterName(chapters: { id: number; nameSimple: string }[] | undefined, chapterId: number): string {
  return chapters?.find((c) => c.id === chapterId)?.nameSimple ?? `Sourate ${chapterId}`;
}

const percent = (c: ChapterComprehension | undefined) => (c && c.totalWords > 0 ? Math.round((c.knownWords / c.totalWords) * 100) : 0);

/** Écran de départ d'une séance sur une sourate : ce qu'on va apprendre, pour quels versets. */
export function SessionStart({ session, onStart }: { session: LearningSession; onStart: () => void }) {
  const colors = useColors();
  const chapters = useChapters();
  const count = session.words.length;
  const minutes = Math.max(2, Math.round(count * 0.7));
  const verses = session.verses;
  return (
    <SafeArea style={[styles.flex, styles.start, { backgroundColor: colors.background }]}>
      <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
        <Ionicons name="book-outline" size={14} color={colors.accent} />
        <AppText variant="label" color={colors.primaryStrong}>
          Comprendre une sourate
        </AppText>
      </View>
      <AppText variant="display" center>
        {chapterName(chapters.data, session.chapterId ?? 0)}
      </AppText>
      <AppText muted center>
        {count} mot{count > 1 ? "s" : ""} · environ {minutes} min
        {verses ? ` · ${verses.from === verses.to ? `verset ${verses.from}` : `versets ${verses.from} à ${verses.to}`}` : ""}
      </AppText>
      {session.coverage ? (
        <View style={styles.coverageRow}>
          <ProgressRing value={percent(session.coverage) / 100} size={72} stroke={5} color={colors.accent}>
            <AppText variant="bodyStrong">{percent(session.coverage)} %</AppText>
          </ProgressRing>
          <AppText variant="caption" muted style={styles.flex}>
            {"de la sourate compris aujourd'hui. Chaque mot appris en débloque d'autres : à la fin, vous relirez le verset."}
          </AppText>
        </View>
      ) : null}
      <Button title="Commencer" onPress={onStart} style={styles.stretch} />
    </SafeArea>
  );
}

/**
 * Le verset où le mot apparaît, le mot en couleur, avec sa traduction : on apprend un mot
 * dans une phrase que l'on sait déjà réciter.
 */
export function VerseContext({ location }: { location: string }) {
  const colors = useColors();
  const translationId = useAuth((s) => s.user?.translationId ?? null);
  const [chapter, verseNumber, position] = location.split(":").map(Number);
  const verse = useVerse(`${chapter}:${verseNumber}`, translationId);
  if (verse.isPending) return <ActivityIndicator color={colors.primary} />;
  if (!verse.data) return null;
  const words = verse.data.words.filter((w) => w.type === "word");
  return (
    <Card tone="flat" style={styles.context}>
      <AppText variant="label" muted>
        Dans le verset {chapter}:{verseNumber}
      </AppText>
      <ArabicText size={26} accessibilityLabel={verse.data.textUthmani}>
        {words.map((w, i) => (
          <Text key={w.location} style={w.position === position ? { color: colors.accent } : undefined}>
            {w.textUthmani}
            {i < words.length - 1 ? " " : ""}
          </Text>
        ))}
      </ArabicText>
      {verse.data.translation ? (
        <AppText variant="caption" muted>
          {verse.data.translation.text}
        </AppText>
      ) : null}
    </Card>
  );
}

/**
 * Fin de séance sur une sourate : on relit le ou les versets travaillés, les mots reconnus en
 * couleur, avec la récitation, et la part comprise qui a progressé.
 */
export function VerseReview({ session, result, onDone }: { session: LearningSession; result: SessionResult; onDone: () => void }) {
  const colors = useColors();
  const chapterId = session.chapterId ?? 0;
  const chapters = useChapters();
  const recitationId = useAuth((s) => s.user?.recitationId ?? null);
  const after = useChapterComprehension(chapterId);
  const known = useKnownWords(chapterId, true);
  const audio = useChapterAudio(chapterId, recitationId);

  const keys = useMemo(() => {
    const learnedVerses = [...new Set(Object.values(session.verseByWord ?? {}).map((loc) => Number(loc.split(":")[1])))].sort((a, b) => a - b);
    const range = session.verses ? Array.from({ length: session.verses.to - session.verses.from + 1 }, (_, i) => session.verses!.from + i) : learnedVerses;
    const chosen = range.length <= MAX_REVIEW_VERSES ? range : learnedVerses.slice(0, MAX_REVIEW_VERSES);
    return chosen.map((v) => `${chapterId}:${v}`);
  }, [session, chapterId]);

  const tracks = useMemo(
    () =>
      keys
        .map((key) => audio.data?.files.find((f) => f.verseKey === key))
        .filter((f): f is NonNullable<typeof f> => Boolean(f))
        .map((f) => ({ key: f.verseKey, url: f.url, words: f.words })),
    [keys, audio.data],
  );
  const player = useTrackQueue(tracks, { autoAdvance: true });

  const before = percent(session.coverage);
  const now = after.data ? percent(after.data) : null;

  return (
    <SafeArea style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.review}>
        <View style={[styles.badge, { backgroundColor: colors.successSoft }]}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <AppText variant="label" color={colors.success}>
            +{result.xpGained} XP · {result.score} %
          </AppText>
        </View>
        <AppText variant="display">Lisez le verset</AppText>
        <AppText muted>Les mots en couleur sont ceux que vous reconnaissez maintenant.</AppText>
        {keys.map((key) => (
          <ReviewVerse key={key} verseKey={key} known={known.data} recited={player.currentKey === key ? player.currentWord : null} />
        ))}
        {tracks.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={player.playing ? "Mettre en pause" : "Écouter la récitation"}
            onPress={player.toggle}
            style={({ pressed }) => [styles.listen, { backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.7 : 1 }]}>
            <Ionicons name={player.playing ? "pause" : "play"} size={18} color={colors.primary} />
            <AppText variant="bodyStrong" color={colors.primary}>
              {player.playing ? "Pause" : "Écouter la récitation"}
            </AppText>
          </Pressable>
        ) : null}
        <Card style={styles.progress}>
          <AppText variant="label" muted>
            {chapterName(chapters.data, chapterId)} · part comprise
          </AppText>
          <View style={styles.progressRow}>
            <AppText variant="title" muted>
              {before} %
            </AppText>
            <Ionicons name="arrow-forward" size={20} color={colors.textMuted} />
            {now === null ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <AppText variant="title" color={colors.success}>
                {now} %
              </AppText>
            )}
          </View>
        </Card>
        <Button
          title="Terminer"
          onPress={() => {
            player.stop();
            onDone();
          }}
          style={styles.stretch}
        />
      </View>
    </SafeArea>
  );
}

function ReviewVerse({ verseKey, known, recited }: { verseKey: string; known: Set<string> | undefined; recited: number | null }) {
  const colors = useColors();
  const translationId = useAuth((s) => s.user?.translationId ?? null);
  const verse = useVerse(verseKey, translationId);
  const [, verseNumber] = verseKey.split(":");
  if (!verse.data) return <ActivityIndicator color={colors.primary} />;
  const words = verse.data.words.filter((w) => w.type === "word");
  return (
    <View style={styles.verse}>
      <Text style={[styles.verseText, { color: colors.arabic }]} accessibilityLabel={verse.data.textUthmani}>
        {words.map((w, i) => {
          const isKnown = known?.has(`${verseNumber}:${w.position}`);
          const isRecited = recited === w.position;
          return (
            <Text key={w.location} style={{ color: isRecited ? colors.accent : isKnown ? colors.primary : colors.arabic }}>
              {w.textUthmani}
              {i < words.length - 1 ? " " : ""}
            </Text>
          );
        })}
      </Text>
      {verse.data.translation ? (
        <AppText variant="caption" muted>
          {verse.data.translation.text}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stretch: { alignSelf: "stretch" },
  start: { padding: spacing.xl, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  badge: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "center", paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill },
  coverageRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg, alignSelf: "stretch" },
  context: { gap: spacing.sm },
  review: { flex: 1, padding: spacing.xl, gap: spacing.lg },
  verse: { gap: spacing.sm },
  verseText: { fontFamily: fonts.arabic, fontSize: 28, lineHeight: 54, writingDirection: "rtl", textAlign: "right" },
  listen: { flexDirection: "row", alignItems: "center", gap: spacing.sm, alignSelf: "flex-start", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, minHeight: 44, borderRadius: radius.pill },
  progress: { gap: spacing.sm },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
});
