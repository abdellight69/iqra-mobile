import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { ErrorState, LoadingState } from "@/components/States";
import { VerseBadge } from "@/components/VerseBadge";
import { useChapters } from "@/lib/queries";
import { fonts, radius, spacing, useColors } from "@/lib/theme";
import type { Chapter } from "@/lib/types";

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ'’`-]/g, "")
    .toLowerCase();
}

export default function QuranTab() {
  const colors = useColors();
  const chapters = useChapters();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const list = chapters.data ?? [];
    const q = normalize(query.trim());
    if (!q) return list;
    return list.filter(
      (c) => String(c.id) === q || normalize(c.nameSimple).includes(q) || normalize(c.translatedName).includes(q) || c.nameArabic.includes(query.trim()),
    );
  }, [chapters.data, query]);

  return (
    <SafeAreaView edges={["top"]} style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <AppText variant="display">Le Coran</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="Signets" hitSlop={10} onPress={() => router.push("/bookmarks")}>
            <Ionicons name="bookmarks-outline" size={24} color={colors.primary} />
          </Pressable>
        </View>
        <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher une sourate (nom ou numéro)"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {chapters.isPending ? (
        <LoadingState />
      ) : chapters.isError ? (
        <ErrorState error={chapters.error} onRetry={() => void chapters.refetch()} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
          renderItem={({ item }) => <ChapterRow chapter={item} />}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

function ChapterRow({ chapter }: { chapter: Chapter }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: "/surah/[id]", params: { id: String(chapter.id) } })}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      <VerseBadge value={chapter.id} size={42} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{chapter.nameSimple}</AppText>
        <AppText variant="caption" muted>
          {chapter.translatedName} · {chapter.versesCount} versets · {chapter.revelationPlace === "madinah" ? "Médinoise" : "Mecquoise"}
        </AppText>
      </View>
      <ArabicText size="sm">{chapter.nameArabic}</ArabicText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.md },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  search: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 46 },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15 },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  separator: { height: StyleSheet.hairlineWidth },
});
