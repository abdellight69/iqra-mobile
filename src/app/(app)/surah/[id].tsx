import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View, type ListViewToken } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Card } from "@/components/Card";
import { ErrorState, LoadingState } from "@/components/States";
import { VerseCard } from "@/components/VerseCard";
import { useTrackQueue } from "@/lib/audio";
import { BASMALA, showsBasmala } from "@/lib/quran-text";
import {
  useBookmarks,
  useChapter,
  useChapterAudio,
  useChapterInfo,
  useCreatePlan,
  useMe,
  useRecordReading,
  useSaveReadingPosition,
  useToggleBookmark,
  useVerses,
} from "@/lib/queries";
import { ARABIC_SIZES, useReaderSettings } from "@/lib/reader-store";
import { radius, spacing, useColors } from "@/lib/theme";
import type { Verse, Word } from "@/lib/types";

export default function SurahReader() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; verse?: string }>();
  const chapterId = Number(params.id);
  const targetVerse = params.verse ? Number(params.verse) : null;

  const me = useMe();
  const chapter = useChapter(chapterId);
  const verses = useVerses(chapterId, me.data?.translationId ?? null);
  const audio = useChapterAudio(chapterId, me.data?.recitationId ?? null);
  const bookmarks = useBookmarks();
  const toggleBookmark = useToggleBookmark();
  const createPlan = useCreatePlan();
  const savePosition = useSaveReadingPosition();
  const recordReading = useRecordReading();
  const settings = useReaderSettings();

  const list = useMemo<Verse[]>(() => verses.data?.pages.flatMap((p) => p.verses) ?? [], [verses.data]);
  const tracks = useMemo(() => (audio.data?.files ?? []).map((f) => ({ key: f.verseKey, url: f.url })), [audio.data]);
  const queue = useTrackQueue(tracks);
  const bookmarkByKey = useMemo(
    () => new Map((bookmarks.data ?? []).filter((b) => b.chapterId === chapterId).map((b) => [b.verseNumber, b.id])),
    [bookmarks.data, chapterId],
  );

  const listRef = useRef<FlatList<Verse>>(null);
  const seen = useRef(new Set<number>());
  const topVerse = useRef<number | null>(null);
  const scrolledToTarget = useRef(false);

  // Ouvre la sourate au verset demandé (signet, reprise de lecture) en chargeant les pages nécessaires.
  useEffect(() => {
    if (!targetVerse || scrolledToTarget.current || !verses.data) return;
    const index = list.findIndex((v) => v.verseNumber === targetVerse);
    if (index >= 0) {
      scrolledToTarget.current = true;
      requestAnimationFrame(() => listRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0 }));
    } else if (verses.hasNextPage && !verses.isFetchingNextPage) {
      void verses.fetchNextPage();
    }
  }, [targetVerse, list, verses]);

  // Suit le verset en cours de récitation.
  useEffect(() => {
    if (!queue.currentKey) return;
    const index = list.findIndex((v) => v.key === queue.currentKey);
    if (index >= 0) listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.1 });
    else if (verses.hasNextPage) void verses.fetchNextPage();
  }, [queue.currentKey, list, verses]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    const visible = viewableItems.map((v) => v.item as Verse | undefined).filter((v): v is Verse => Boolean(v));
    for (const verse of visible) seen.current.add(verse.verseNumber);
    if (visible[0]) topVerse.current = visible[0].verseNumber;
  }, []);

  // En quittant l'écran : mémorise la position et comptabilise les versets lus.
  useFocusEffect(
    useCallback(
      () => () => {
        if (topVerse.current) savePosition.mutate({ chapterId, verseNumber: topVerse.current });
        if (seen.current.size > 0) recordReading.mutate(Math.min(seen.current.size, 300));
        seen.current = new Set();
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [chapterId],
    ),
  );

  const openWord = useCallback((word: Word) => {
    router.push({
      pathname: "/word/[location]",
      params: {
        location: word.location,
        text: word.textUthmani,
        transliteration: word.transliteration ?? "",
        translation: word.translation ?? "",
        language: word.translationLanguage ?? "",
        audio: word.audioUrl ?? "",
      },
    });
  }, []);

  const memorizeVerse = useCallback(
    (verse: Verse) => {
      createPlan.mutate(
        { chapterId, fromVerse: verse.verseNumber, toVerse: verse.verseNumber },
        { onSuccess: ({ plan }) => router.push({ pathname: "/memorize/[planId]", params: { planId: plan.id } }) },
      );
    },
    [chapterId, createPlan],
  );

  const cycleSize = () => {
    const i = ARABIC_SIZES.indexOf(settings.arabicSize as (typeof ARABIC_SIZES)[number]);
    settings.setArabicSize(ARABIC_SIZES[(i + 1) % ARABIC_SIZES.length] ?? 32);
  };

  const title = chapter.data ? `${chapter.data.id}. ${chapter.data.nameSimple}` : "";

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title,
          headerRight: () => (
            <View style={styles.headerActions}>
              <HeaderIcon icon="text" label="Taille du texte arabe" onPress={cycleSize} />
              <HeaderIcon
                icon={settings.showWordByWord ? "grid" : "grid-outline"}
                label="Mot à mot"
                onPress={settings.toggleWordByWord}
              />
              <HeaderIcon
                icon={settings.showTranslation ? "language" : "language-outline"}
                label="Traduction"
                onPress={settings.toggleTranslation}
              />
            </View>
          ),
        }}
      />

      {verses.isPending ? (
        <LoadingState label="Chargement de la sourate…" />
      ) : verses.isError ? (
        <ErrorState error={verses.error} onRetry={() => void verses.refetch()} />
      ) : (
        <FlatList
          ref={listRef}
          data={list}
          keyExtractor={(v) => v.key}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 120 }]}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListHeaderComponent={<ChapterHeader chapterId={chapterId} />}
          onEndReached={() => verses.hasNextPage && !verses.isFetchingNextPage && void verses.fetchNextPage()}
          onEndReachedThreshold={0.6}
          ListFooterComponent={verses.isFetchingNextPage ? <ActivityIndicator style={{ margin: spacing.lg }} color={colors.primary} /> : undefined}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          onScrollToIndexFailed={({ index }) =>
            setTimeout(() => listRef.current?.scrollToIndex({ index, animated: false }), 250)
          }
          renderItem={({ item }) => (
            <VerseCard
              verse={item}
              arabicSize={settings.arabicSize}
              showTranslation={settings.showTranslation}
              showWordByWord={settings.showWordByWord}
              active={queue.currentKey === item.key}
              bookmarked={bookmarkByKey.has(item.verseNumber)}
              onWordPress={openWord}
              onPlay={() => (queue.currentKey === item.key ? queue.toggle() : queue.playKey(item.key))}
              onBookmark={() =>
                toggleBookmark.mutate({ chapterId, verseNumber: item.verseNumber, existingId: bookmarkByKey.get(item.verseNumber) })
              }
              onMemorize={() => memorizeVerse(item)}
            />
          )}
        />
      )}

      {tracks.length > 0 ? (
        <View style={[styles.player, { backgroundColor: colors.surface, borderColor: colors.border, bottom: insets.bottom + spacing.md }]}>
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{queue.currentKey ? `Verset ${queue.currentKey.split(":")[1]}` : "Écouter la sourate"}</AppText>
            <AppText variant="caption" muted>
              {queue.buffering ? "Chargement…" : queue.currentKey ? "Récitation verset par verset" : "Lecture continue depuis le début"}
            </AppText>
          </View>
          <HeaderIcon icon="play-skip-back" label="Verset précédent" onPress={queue.previous} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={queue.playing ? "Pause" : "Lecture"}
            onPress={queue.toggle}
            style={[styles.playButton, { backgroundColor: colors.primary }]}>
            <Ionicons name={queue.playing ? "pause" : "play"} size={24} color={colors.onPrimary} />
          </Pressable>
          <HeaderIcon icon="play-skip-forward" label="Verset suivant" onPress={queue.next} />
        </View>
      ) : null}
    </View>
  );
}

function ChapterHeader({ chapterId }: { chapterId: number }) {
  const colors = useColors();
  const chapter = useChapter(chapterId);
  const info = useChapterInfo(chapterId);
  const [open, setOpen] = useState(false);
  const c = chapter.data;
  if (!c) return null;

  return (
    <View style={styles.headerBlock}>
      <Card tone="primary" style={styles.hero}>
        <ArabicText size="xl" color="#F7EDCC" center>
          {c.nameArabic}
        </ArabicText>
        <AppText variant="title" color="#FFFFFF" center>
          {c.nameSimple}
        </AppText>
        <AppText color="#DCEFE8" center>
          {c.translatedName} · {c.versesCount} versets · {c.revelationPlace === "madinah" ? "Médinoise" : "Mecquoise"}
        </AppText>
      </Card>

      <Pressable accessibilityRole="button" onPress={() => setOpen((o) => !o)} style={styles.infoToggle}>
        <AppText variant="bodyStrong" color={colors.primary}>
          À propos de cette sourate
        </AppText>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.primary} />
      </Pressable>
      {open ? (
        <Card>
          {info.isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : info.data ? (
            <View style={{ gap: spacing.sm }}>
              {info.data.paragraphs.slice(0, 12).map((p, i) => (
                <AppText key={i}>{p}</AppText>
              ))}
              <AppText variant="caption" muted>
                Source : {info.data.source}
                {info.data.languageName && info.data.languageName !== "french" ? ` (${info.data.languageName})` : ""}
              </AppText>
            </View>
          ) : (
            <AppText muted>Présentation indisponible.</AppText>
          )}
        </Card>
      ) : null}

      {showsBasmala(chapterId) ? (
        <ArabicText size={30} center>
          {BASMALA}
        </ArabicText>
      ) : null}
    </View>
  );
}

function HeaderIcon({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} onPress={onPress} style={{ padding: spacing.xs }}>
      <Ionicons name={icon} size={22} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: spacing.lg },
  headerActions: { flexDirection: "row", gap: spacing.xs },
  headerBlock: { gap: spacing.md, marginBottom: spacing.lg },
  hero: { gap: spacing.xs, paddingVertical: spacing.xl },
  infoToggle: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "center", padding: spacing.xs },
  player: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  playButton: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
});
