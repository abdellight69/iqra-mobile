import Ionicons from "@expo/vector-icons/Ionicons";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { type ComponentProps, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Card } from "@/components/Card";
import { SectionHeader } from "@/components/SectionHeader";
import { errorMessage } from "@/lib/api";
import { useOneShot } from "@/lib/audio";
import { fetchChapterAudio, useChapters, useMe, useUnifiedSearch } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import type { SearchVerse } from "@/lib/types";

const hasArabic = (text: string) => /[ء-ي]/.test(text);

const MATCHED_BY: Record<SearchVerse["matchedBy"], string> = {
  reference: "par sa référence",
  arabic: "dans le texte arabe (Tanzil)",
  phonetic: "par la phonétique",
  translation: "dans la traduction",
};

const LESSON_KIND: Record<string, string> = { letters: "Lettres", vowels: "Voyelles", rules: "Règles", words: "Mots", verses: "Versets" };

function plural(n: number, word: string): string {
  return `${n} ${word}${n > 1 ? "s" : ""}`;
}

/**
 * Recherche partout : une référence (2:255), une sourate, un verset (arabe, phonétique ou traduction),
 * un mot du lexique ou une leçon de lecture. Les versets s'affichent en arabe, phonétique et traduction, avec l'audio.
 */
export default function SearchScreen() {
  const colors = useColors();
  const me = useMe();
  const chapters = useChapters();
  const client = useQueryClient();
  const player = useOneShot();
  const params = useLocalSearchParams<{ q?: string }>();
  const [input, setInput] = useState(params.q ?? "");
  const [query, setQuery] = useState(params.q ?? "");
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  // On attend une courte pause dans la frappe avant d'interroger le serveur.
  useEffect(() => {
    const t = setTimeout(() => setQuery(input), 350);
    return () => clearTimeout(t);
  }, [input]);
  const search = useUnifiedSearch(query, me.data?.translationId ?? null);
  const data = query.trim() ? search.data : undefined;
  const arabic = hasArabic(input);
  const empty = data && data.chapters.length + data.verses.items.length + data.words.length + data.lessons.length === 0;
  const currentlyPlaying = player.playing ? playingKey : null;
  const chapterName = (id: number) => chapters.data?.find((c) => c.id === id)?.nameSimple ?? null;

  async function play(verse: SearchVerse) {
    setLoadingKey(verse.key);
    try {
      const audio = await fetchChapterAudio(client, verse.chapterId, me.data?.recitationId ?? null);
      const file = audio.files.find((f) => f.verseKey === verse.key);
      if (!file) return;
      setPlayingKey(verse.key);
      player.play(file.url, file);
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={[styles.field, { backgroundColor: colors.surfaceMuted }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={input}
          onChangeText={setInput}
          autoFocus
          autoCorrect={false}
          placeholder="Verset, sourate, mot, leçon… ou 2:255"
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.primary}
          style={[styles.input, { color: colors.text, writingDirection: arabic ? "rtl" : "ltr", textAlign: arabic ? "right" : "left" }]}
          clearButtonMode="while-editing"
          returnKeyType="search"
          accessibilityLabel="Rechercher partout"
        />
        {search.isFetching ? <ActivityIndicator color={colors.primary} /> : null}
      </View>

      {search.isError ? (
        <AppText variant="caption" color={colors.danger}>
          {errorMessage(search.error)}
        </AppText>
      ) : null}

      {!data ? (
        <View style={styles.hints}>
          <Hint icon="book-outline" text="Une référence : 2:255, « baqara 255 » ou « fatiha »." />
          <Hint icon="language-outline" text="Un mot arabe sans voyelles : الرحمن trouve ٱلرَّحْمَٰنِ." />
          <Hint icon="chatbubble-ellipses-outline" text="En phonétique : « bismillah », « iyyaka nabudu »." />
          <Hint icon="text-outline" text="En français : « miséricorde », « lumière » (traductions)." />
          <Hint icon="school-outline" text="Un mot du lexique ou une leçon de lecture." />
        </View>
      ) : null}

      {empty ? (
        <AppText muted center style={styles.empty}>
          Aucun résultat pour « {data.query} ».
        </AppText>
      ) : null}

      {data && data.chapters.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title={plural(data.chapters.length, "Sourate")} />
          {data.chapters.map((c) => (
            <Card key={c.id} onPress={() => router.push({ pathname: "/surah/[id]", params: { id: String(c.id) } })} style={styles.row}>
              <View style={[styles.number, { backgroundColor: colors.surfaceMuted }]}>
                <AppText variant="label">{c.id}</AppText>
              </View>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{c.nameSimple}</AppText>
                <AppText variant="caption" muted>
                  {c.translatedName} · {plural(c.versesCount, "verset")}
                </AppText>
              </View>
              <ArabicText size={22}>{c.nameArabic}</ArabicText>
            </Card>
          ))}
        </View>
      ) : null}

      {data && data.verses.items.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title={plural(data.verses.total, "Verset")} />
          {data.verses.matchedBy ? (
            <AppText variant="caption" muted>
              Trouvé{data.verses.total > 1 ? "s" : ""} {MATCHED_BY[data.verses.matchedBy]}
              {data.verses.total > data.verses.items.length ? ` · ${data.verses.items.length} premiers affichés` : ""}
            </AppText>
          ) : null}
          {data.verses.items.map((v) => (
            <VerseResult
              key={v.key}
              verse={v}
              chapterName={chapterName(v.chapterId)}
              playing={currentlyPlaying === v.key}
              loading={loadingKey === v.key}
              onPlay={() => void play(v)}
            />
          ))}
        </View>
      ) : null}

      {data && data.words.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title={plural(data.words.length, "Mot") + " du lexique"} />
          {data.words.map((w) => (
            <Card key={w.id} onPress={() => router.push({ pathname: "/learn/[lessonId]", params: { lessonId: w.lessonId } })} style={styles.row}>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{w.fr ?? "—"}</AppText>
                <AppText variant="caption" muted>
                  {w.lessonTitle} · page {w.sourcePage}
                </AppText>
              </View>
              {w.ar ? <ArabicText size={24}>{w.ar}</ArabicText> : null}
            </Card>
          ))}
        </View>
      ) : null}

      {data && data.lessons.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title={plural(data.lessons.length, "Leçon") + " de lecture"} />
          {data.lessons.map((l) => (
            <Card key={l.id} onPress={() => router.push({ pathname: "/reading/session", params: { lessonId: l.id } })} style={styles.row}>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{l.title}</AppText>
                <AppText variant="caption" muted numberOfLines={2}>
                  Unité {l.unit} · {l.unitTitle}
                  {LESSON_KIND[l.kind] ? ` · ${LESSON_KIND[l.kind]}` : ""}
                </AppText>
                <AppText variant="caption" muted numberOfLines={2}>
                  {l.summary}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Card>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function Hint({ icon, text }: { icon: ComponentProps<typeof Ionicons>["name"]; text: string }) {
  const colors = useColors();
  return (
    <View style={styles.hint}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <AppText variant="caption" muted style={styles.flex}>
        {text}
      </AppText>
    </View>
  );
}

function VerseResult({
  verse,
  chapterName,
  playing,
  loading,
  onPlay,
}: {
  verse: SearchVerse;
  chapterName: string | null;
  playing: boolean;
  loading: boolean;
  onPlay: () => void;
}) {
  const colors = useColors();
  return (
    <Card onPress={() => router.push({ pathname: "/surah/[id]", params: { id: String(verse.chapterId), verse: String(verse.verseNumber) } })} style={styles.verse}>
      <View style={styles.verseHeader}>
        <AppText variant="label" muted style={styles.flex}>
          {chapterName ? `${chapterName} · ` : ""}
          {verse.key}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playing ? "Lecture en cours" : `Écouter le verset ${verse.key}`}
          onPress={onPlay}
          hitSlop={8}
          style={({ pressed }) => [styles.play, { backgroundColor: playing ? colors.primary : colors.surfaceMuted, opacity: pressed ? 0.7 : 1 }]}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name={playing ? "volume-high" : "play"} size={16} color={playing ? colors.onPrimary : colors.primary} />
          )}
        </Pressable>
      </View>
      <ArabicText size={24}>{verse.textUthmani}</ArabicText>
      {verse.transliteration ? (
        <AppText italic color={colors.textMuted} numberOfLines={3}>
          {verse.transliteration}
        </AppText>
      ) : null}
      {verse.translation ? <AppText numberOfLines={4}>{verse.translation}</AppText> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  field: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radius.lg, paddingHorizontal: spacing.md },
  input: { flex: 1, fontSize: 17, paddingVertical: spacing.md },
  hints: { gap: spacing.sm, marginTop: spacing.sm },
  hint: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  empty: { marginTop: spacing.xl },
  section: { gap: spacing.sm, marginTop: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  number: { width: 34, height: 34, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  verse: { gap: spacing.xs },
  verseHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  play: { width: 34, height: 34, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
});
