import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { IconButton } from "@/components/IconButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState, LoadingState } from "@/components/States";
import { VerseBadge } from "@/components/VerseBadge";
import { useOffline } from "@/lib/offline";
import { useChapters, useComprehension, useMemorizationMap } from "@/lib/queries";
import { fonts, radius, spacing, useColors } from "@/lib/theme";
import type { Chapter, ChapterComprehension } from "@/lib/types";

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ'’`-]/g, "")
    .toLowerCase();
}

export default function QuranTab() {
  const colors = useColors();
  const chapters = useChapters();
  const comprehension = useComprehension();
  const memorization = useMemorizationMap();
  const [query, setQuery] = useState("");
  const comprehensionById = useMemo(
    () => new Map((comprehension.data ?? []).map((c) => [c.chapterId, c])),
    [comprehension.data],
  );
  // Versets solides par sourate (carte de mémorisation) : « Mémorisée » quand tous le sont.
  const solidById = useMemo(() => new Map((memorization.data?.chapters ?? []).map((c) => [c.chapterId, c.solid])), [memorization.data]);

  const filtered = useMemo(() => {
    const list = chapters.data ?? [];
    const q = normalize(query.trim());
    if (!q) return list;
    return list.filter(
      (c) =>
        String(c.id) === q ||
        normalize(c.nameSimple).includes(q) ||
        normalize(c.translatedName).includes(q) ||
        c.nameArabic.includes(query.trim()),
    );
  }, [chapters.data, query]);

  return (
    <SafeAreaView edges={["top"]} style={[styles.flex, { backgroundColor: colors.background }]}>
      {chapters.isPending ? (
        <LoadingState />
      ) : chapters.isError ? (
        <ErrorState error={chapters.error} onRetry={() => void chapters.refetch()} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <ScreenHeader
                eyebrow={`${chapters.data.length} sourates`}
                title="Le Coran"
                right={
                  <View style={styles.headerActions}>
                    <IconButton icon="search" label="Rechercher partout" tone="filled" onPress={() => router.push("/search")} />
                    <IconButton icon="bookmark-outline" label="Signets" tone="filled" onPress={() => router.push("/bookmarks")} />
                  </View>
                }
              />
              <View style={[styles.search, { backgroundColor: colors.surfaceMuted }]}>
                <Ionicons name="search" size={17} color={colors.textMuted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Filtrer les sourates"
                  placeholderTextColor={colors.textFaint}
                  selectionColor={colors.primary}
                  style={[styles.searchInput, { color: colors.text }]}
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                  returnKeyType="search"
                  onSubmitEditing={() => query.trim() && router.push({ pathname: "/search", params: { q: query.trim() } })}
                />
              </View>
              {query.trim() ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: "/search", params: { q: query.trim() } })}
                  style={({ pressed }) => [styles.everywhere, { opacity: pressed ? 0.6 : 1 }]}>
                  <Ionicons name="search-circle" size={22} color={colors.primary} />
                  <AppText color={colors.primary} style={styles.flex} numberOfLines={1}>
                    Rechercher « {query.trim()} » partout · versets, mots, leçons
                  </AppText>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </Pressable>
              ) : null}
            </View>
          }
          renderItem={({ item }) => <ChapterRow chapter={item} comprehension={comprehensionById.get(item.id)} solid={solidById.get(item.id)} />}
        />
      )}
    </SafeAreaView>
  );
}

function ChapterRow({ chapter, comprehension, solid }: { chapter: Chapter; comprehension?: ChapterComprehension; solid?: number }) {
  const colors = useColors();
  const downloaded = useOffline((s) => Boolean(s.entries[chapter.id]));
  const known = comprehension && comprehension.totalWords > 0 ? Math.round((comprehension.knownWords / comprehension.totalWords) * 100) : 0;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: "/surah/[id]", params: { id: String(chapter.id) } })}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.55 : 1 }]}>
      <VerseBadge value={chapter.id} size={38} />
      <View style={styles.flex}>
        <AppText variant="heading">{chapter.nameSimple}</AppText>
        <AppText variant="caption" muted>
          {chapter.translatedName} · {chapter.versesCount} versets
        </AppText>
        {downloaded ? (
          <View style={styles.offline}>
            <Ionicons name="cloud-done-outline" size={13} color={colors.textMuted} />
            <AppText variant="caption" muted>
              Hors ligne
            </AppText>
          </View>
        ) : null}
        {known > 0 ? (
          <AppText variant="caption" color={colors.primary}>
            {known} % des mots reconnus
          </AppText>
        ) : null}
        {solid ? (
          <AppText variant="caption" color={colors.accent}>
            {solid === chapter.versesCount ? "Mémorisée" : `${solid}/${chapter.versesCount} versets solides`}
          </AppText>
        ) : null}
      </View>
      <View style={styles.right}>
        <ArabicText size={22}>{chapter.nameArabic}</ArabicText>
        <AppText variant="caption" faint>
          {chapter.revelationPlace === "madinah" ? "Médinoise" : "Mecquoise"}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: "row", gap: spacing.sm },
  flex: { flex: 1 },
  list: { paddingHorizontal: spacing.xl - 4, paddingBottom: spacing.xxl },
  header: { gap: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md },
  search: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radius.pill, paddingHorizontal: spacing.lg, minHeight: 48 },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15 },
  everywhere: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: -spacing.md, paddingHorizontal: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.lg, paddingVertical: spacing.md + 2 },
  right: { alignItems: "flex-end" },
  offline: { flexDirection: "row", alignItems: "center", gap: 4 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 38 + spacing.lg },
});
