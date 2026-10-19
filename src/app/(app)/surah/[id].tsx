import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View, type ListViewToken } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Card } from "@/components/Card";
import { ComprehensionCard } from "@/components/ComprehensionCard";
import { DownloadButton } from "@/components/DownloadButton";
import { TajweedLegend } from "@/components/TajweedLegend";
import { ErrorState, LoadingState } from "@/components/States";
import { IconButton } from "@/components/IconButton";
import { VerseCard } from "@/components/VerseCard";
import { RepeatSheet, type RepeatSettings } from "@/components/RepeatSheet";
import { useTrackQueue } from "@/lib/audio";
import { openWordSheet } from "@/lib/navigation";
import { formatRate, usePlayback } from "@/lib/playback-store";
import { BASMALA, showsBasmala } from "@/lib/quran-text";
import {
  useBookmarks,
  useChapter,
  useChapterAudio,
  useChapterInfo,
  useCreatePlan,
  useKnownWords,
  useOfflineChapter,
  useMe,
  useRecitations,
  useRecordReading,
  useSaveReadingPosition,
  useToggleBookmark,
  useVerses,
} from "@/lib/queries";
import { ARABIC_SIZES, useReaderSettings } from "@/lib/reader-store";
import { elevation, radius, spacing, useColors } from "@/lib/theme";
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
  const knownWords = useKnownWords(chapterId, settings.showKnownWords);
  const offline = useOfflineChapter(chapterId);

  // Sourate téléchargée : on lit la copie locale si elle correspond aux réglages, ou sans réseau.
  const offlineText =
    offline.data && (offline.data.translationId === (me.data?.translationId ?? null) || verses.isError) ? offline.data : null;
  const offlineAudio =
    offline.data && (me.data?.recitationId == null || me.data.recitationId === offline.data.recitationId || audio.isError)
      ? offline.data.audio
      : null;
  const list = useMemo<Verse[]>(
    () => offlineText?.verses ?? verses.data?.pages.flatMap((p) => p.verses) ?? [],
    [offlineText, verses.data],
  );
  const audioFiles = offlineAudio?.files ?? audio.data?.files;
  const tracks = useMemo(
    () => (audioFiles ?? []).map((f) => ({ key: f.verseKey, url: f.url, words: f.words })),
    [audioFiles],
  );
  const canLoadMore = !offlineText && verses.hasNextPage;

  // Répétition d'un passage et vitesse de récitation.
  const rate = usePlayback((p) => p.rate);
  const cycleRate = usePlayback((p) => p.cycleRate);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [repeatSettings, setRepeatSettings] = useState<RepeatSettings | null>(null);
  const trackIndex = (verse: number) => tracks.findIndex((t) => t.key === `${chapterId}:${verse}`);
  const loop =
    repeatSettings && trackIndex(repeatSettings.fromVerse) >= 0 && trackIndex(repeatSettings.toVerse) >= 0
      ? { start: trackIndex(repeatSettings.fromVerse), end: trackIndex(repeatSettings.toVerse), rounds: repeatSettings.rounds }
      : null;
  const recitations = useRecitations();
  const recitationId = offlineAudio ? offline.data?.recitationId : audio.data?.recitationId;
  const reciter = recitations.data?.find((r) => r.id === recitationId);
  const surahName = chapter.data?.nameSimple ?? `Sourate ${chapterId}`;
  const nowPlaying = useCallback(
    (track: { key: string }) => ({
      title: `${surahName} · verset ${track.key.split(":")[1]}`,
      artist: reciter ? (reciter.translatedName ?? reciter.reciterName) : "Récitation du Coran",
      albumTitle: "Iqra",
    }),
    [surahName, reciter],
  );
  const queue = useTrackQueue(tracks, { rate, loop, repeat: repeatSettings?.verseRepeat ?? 1, nowPlaying });
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
    if (!targetVerse || scrolledToTarget.current || list.length === 0) return;
    const index = list.findIndex((v) => v.verseNumber === targetVerse);
    if (index >= 0) {
      scrolledToTarget.current = true;
      requestAnimationFrame(() => listRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0 }));
    } else if (canLoadMore && !verses.isFetchingNextPage) {
      void verses.fetchNextPage();
    }
  }, [targetVerse, list, verses, canLoadMore]);

  // Suit le verset en cours de récitation : une fois par verset (l'effet est rejoué à chaque rendu,
  // soit toutes les 100 ms pendant la lecture, et ne doit pas ramener l'utilisateur qui fait défiler).
  const followedKey = useRef<string | null>(null);
  useEffect(() => {
    const key = queue.currentKey;
    if (!key) {
      followedKey.current = null;
      return;
    }
    if (followedKey.current === key) return;
    const index = list.findIndex((v) => v.key === key);
    if (index >= 0) {
      followedKey.current = key;
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.1 });
    } else if (canLoadMore && !verses.isFetchingNextPage) {
      void verses.fetchNextPage();
    }
  }, [queue.currentKey, list, verses, canLoadMore]);

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

  const openWord = useCallback((word: Word) => openWordSheet(word), []);

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

  const title = chapter.data?.nameSimple ?? "";

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title,
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton icon="text" label="Taille du texte arabe" onPress={cycleSize} />
              <IconButton
                icon={settings.showTransliteration ? "ear" : "ear-outline"}
                label="Phonétique"
                color={settings.showTransliteration ? colors.primary : undefined}
                onPress={settings.toggleTransliteration}
              />
              <IconButton
                icon={settings.showTajweed ? "color-palette" : "color-palette-outline"}
                label="Tajwid"
                color={settings.showTajweed ? colors.primary : undefined}
                onPress={settings.toggleTajweed}
              />
              <IconButton
                icon={settings.showWordByWord ? "grid" : "grid-outline"}
                label="Mot à mot"
                color={settings.showWordByWord ? colors.primary : undefined}
                onPress={settings.toggleWordByWord}
              />
              <IconButton
                icon={settings.showTranslation ? "language" : "language-outline"}
                label="Traduction"
                color={settings.showTranslation ? colors.primary : undefined}
                onPress={settings.toggleTranslation}
              />
            </View>
          ),
        }}
      />

      {!offlineText && verses.isPending ? (
        <LoadingState label="Chargement de la sourate…" />
      ) : !offlineText && verses.isError ? (
        <ErrorState error={verses.error} onRetry={() => void verses.refetch()} />
      ) : (
        <FlatList
          ref={listRef}
          data={list}
          keyExtractor={(v) => v.key}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 120 }]}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
          ListHeaderComponent={<ChapterHeader chapterId={chapterId} />}
          onEndReached={() => canLoadMore && !verses.isFetchingNextPage && void verses.fetchNextPage()}
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
              showTransliteration={settings.showTransliteration}
              showWordByWord={settings.showWordByWord}
              showTajweed={settings.showTajweed}
              knownWords={settings.showKnownWords ? knownWords.data : undefined}
              active={queue.currentKey === item.key}
              recitedWord={queue.currentKey === item.key ? queue.currentWord : null}
              bookmarked={bookmarkByKey.has(item.verseNumber)}
              onWordPress={openWord}
              onPlay={() => (queue.currentKey === item.key ? queue.toggle() : queue.playKey(item.key))}
              onBookmark={() =>
                toggleBookmark.mutate({ chapterId, verseNumber: item.verseNumber, existingId: bookmarkByKey.get(item.verseNumber) })
              }
              onMemorize={() => memorizeVerse(item)}
              onShare={() => router.push({ pathname: "/share/[key]", params: { key: item.key } })}
              onTafsir={() => router.push({ pathname: "/tafsir/[key]", params: { key: item.key } })}
            />
          )}
        />
      )}

      {tracks.length > 0 ? (
        <View style={[styles.player, { backgroundColor: colors.text, bottom: insets.bottom + spacing.md }, elevation(colors, 2)]}>
          <View style={styles.flex}>
            <AppText variant="label" color={`${colors.background}99`}>
              {queue.buffering
                ? "Chargement…"
                : repeatSettings
                  ? `Versets ${repeatSettings.fromVerse}–${repeatSettings.toVerse}${
                      repeatSettings.rounds > 1 ? ` · tour ${queue.round}${repeatSettings.rounds === Infinity ? "" : `/${repeatSettings.rounds}`}` : ""
                    }`
                  : queue.currentKey
                    ? "Récitation"
                    : "Écouter"}
            </AppText>
            <AppText variant="headline" color={colors.background}>
              {queue.currentKey ? `Verset ${queue.currentKey.split(":")[1]}` : "Toute la sourate"}
            </AppText>
          </View>
          <IconButton icon="play-skip-back" label="Verset précédent" onPress={queue.previous} color={colors.background} size={18} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={queue.playing ? "Pause" : "Lecture"}
            onPress={queue.toggle}
            style={({ pressed }) => [styles.playButton, { backgroundColor: colors.background, opacity: pressed ? 0.8 : 1 }]}>
            <Ionicons name={queue.playing ? "pause" : "play"} size={20} color={colors.text} />
          </Pressable>
          <IconButton icon="play-skip-forward" label="Verset suivant" onPress={queue.next} color={colors.background} size={18} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Vitesse ${formatRate(rate)}, toucher pour changer`}
            onPress={cycleRate}
            hitSlop={6}
            style={styles.rateButton}>
            <AppText variant="caption" color={rate === 1 ? `${colors.background}99` : colors.accent}>
              {formatRate(rate)}
            </AppText>
          </Pressable>
          <IconButton
            icon={repeatSettings ? "close-circle" : "repeat"}
            label={repeatSettings ? "Arrêter la répétition" : "Répéter un passage"}
            onPress={() => {
              if (!repeatSettings) return setRepeatOpen(true);
              setRepeatSettings(null);
              queue.stop();
            }}
            color={repeatSettings ? colors.accent : colors.background}
            size={18}
          />
        </View>
      ) : null}

      {repeatOpen ? (
        <RepeatSheet
          visible
          versesCount={chapter.data?.versesCount ?? tracks.length}
          initial={(() => {
            const current = queue.currentKey ? Number(queue.currentKey.split(":")[1]) : 1;
            const count = chapter.data?.versesCount ?? tracks.length;
            return { fromVerse: current, toVerse: Math.min(count, current + 4), verseRepeat: 1, rounds: 3 };
          })()}
          onClose={() => setRepeatOpen(false)}
          onStart={(settings) => {
            setRepeatOpen(false);
            setRepeatSettings(settings);
            const start = trackIndex(settings.fromVerse);
            if (start >= 0) queue.playAt(start);
          }}
        />
      ) : null}
    </View>
  );
}

function ChapterHeader({ chapterId }: { chapterId: number }) {
  const colors = useColors();
  const chapter = useChapter(chapterId);
  const info = useChapterInfo(chapterId);
  const [open, setOpen] = useState(false);
  const showTajweed = useReaderSettings((r) => r.showTajweed);
  const c = chapter.data;
  if (!c) return null;

  return (
    <View style={styles.headerBlock}>
      <View style={styles.hero}>
        <AppText variant="label" muted center>
          Sourate {c.id} · {c.revelationPlace === "madinah" ? "Médinoise" : "Mecquoise"} · {c.versesCount} versets
        </AppText>
        <ArabicText size={52} center>
          {c.nameArabic}
        </ArabicText>
        <AppText variant="title" center>
          {c.nameSimple}
        </AppText>
        <AppText variant="serifBody" italic muted center>
          {c.translatedName}
        </AppText>
      </View>

      <Pressable accessibilityRole="button" onPress={() => setOpen((o) => !o)} style={[styles.infoToggle, { backgroundColor: colors.surfaceMuted }]}>
        <AppText variant="caption">À propos de la sourate</AppText>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={colors.textMuted} />
      </Pressable>
      {open ? (
        <Card tone="flat" style={styles.about}>
          {info.isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : info.data ? (
            <>
              {info.data.paragraphs.slice(0, 12).map((p, i) => (
                <AppText key={i}>{p}</AppText>
              ))}
              <AppText variant="caption" muted>
                Source : {info.data.source}
                {info.data.languageName && info.data.languageName !== "french" ? ` (${info.data.languageName})` : ""}
              </AppText>
            </>
          ) : (
            <AppText muted>Présentation indisponible.</AppText>
          )}
        </Card>
      ) : null}

      <DownloadButton chapterId={chapterId} />

      {showTajweed ? <TajweedLegend /> : null}

      <ComprehensionCard chapterId={chapterId} />

      {showsBasmala(chapterId) ? (
        <View style={[styles.basmala, { borderColor: colors.border }]}>
          <ArabicText size={28} center>
            {BASMALA}
          </ArabicText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingHorizontal: spacing.md },
  headerActions: { flexDirection: "row" },
  headerBlock: { gap: spacing.lg, paddingHorizontal: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.sm },
  hero: { gap: spacing.xs, alignItems: "center", paddingVertical: spacing.lg },
  infoToggle: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill },
  about: { gap: spacing.sm },
  basmala: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.md },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.md },
  rateButton: { minWidth: 36, alignItems: "center" },
  player: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.xl,
    paddingRight: spacing.sm,
    borderRadius: radius.pill,
  },
  playButton: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
});
