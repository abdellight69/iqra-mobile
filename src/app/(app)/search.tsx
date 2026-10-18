import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { errorMessage } from "@/lib/api";
import { useChapters, useMe, useQuranSearch } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";

const hasArabic = (text: string) => /[ء-ي]/.test(text);

/** Recherche dans le Coran : un mot arabe (texte du Coran) ou un mot français (traduction). */
export default function SearchScreen() {
  const colors = useColors();
  const me = useMe();
  const chapters = useChapters();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [wholeWord, setWholeWord] = useState(false);
  // On attend une courte pause dans la frappe avant d'interroger le serveur.
  useEffect(() => {
    const t = setTimeout(() => setQuery(input), 400);
    return () => clearTimeout(t);
  }, [input]);
  const search = useQuranSearch(query, wholeWord, me.data?.translationId ?? null);
  const results = search.data?.pages.flatMap((p) => p.results) ?? [];
  const first = search.data?.pages[0];
  const names = new Map(chapters.data?.map((c) => [c.id, c.nameSimple]) ?? []);
  const arabic = hasArabic(input);

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      data={results}
      keyExtractor={(r) => r.key}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={[styles.field, { backgroundColor: colors.surfaceMuted }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={input}
              onChangeText={setInput}
              autoFocus
              autoCorrect={false}
              placeholder="Un mot en arabe ou en français"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
              style={[styles.input, { color: colors.text, writingDirection: arabic ? "rtl" : "ltr", textAlign: arabic ? "right" : "left" }]}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
          </View>
          {arabic ? (
            <Pressable accessibilityRole="switch" accessibilityState={{ checked: wholeWord }} onPress={() => setWholeWord((w) => !w)} style={styles.toggle}>
              <Ionicons name={wholeWord ? "checkbox" : "square-outline"} size={20} color={colors.primary} />
              <AppText variant="caption">Mot entier seulement (sans préfixes ni suffixes)</AppText>
            </Pressable>
          ) : null}
          {first ? (
            <AppText variant="caption" muted>
              {first.total === 0
                ? "Aucun verset trouvé."
                : `${first.total} verset${first.total > 1 ? "s" : ""} · ${first.source === "arabic" ? "recherche dans le texte arabe (Tanzil)" : "recherche dans les traductions (Quran Foundation)"}`}
            </AppText>
          ) : query.trim().length < 2 ? (
            <AppText variant="caption" muted>
              En arabe, les voyelles sont facultatives : الرحمن trouve ٱلرَّحْمَٰنِ. En français, la recherche porte sur les traductions.
            </AppText>
          ) : null}
          {search.isError ? (
            <AppText variant="caption" color={colors.danger}>
              {errorMessage(search.error)}
            </AppText>
          ) : null}
          {search.isFetching && !search.isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : null}
        </View>
      }
      ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      renderItem={({ item }) => (
        <Card onPress={() => router.push({ pathname: "/surah/[id]", params: { id: String(item.chapterId), verse: String(item.verseNumber) } })} style={styles.result}>
          <AppText variant="label" muted>
            {names.get(item.chapterId) ?? `Sourate ${item.chapterId}`} · {item.key}
          </AppText>
          <ArabicText size={24}>{item.textUthmani}</ArabicText>
          {item.translation ? (
            <AppText muted numberOfLines={4}>
              {item.translation}
            </AppText>
          ) : null}
        </Card>
      )}
      ListFooterComponent={
        search.hasNextPage ? (
          <Button title="Plus de résultats" variant="secondary" loading={search.isFetchingNextPage} onPress={() => void search.fetchNextPage()} style={styles.more} />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  header: { gap: spacing.md, marginBottom: spacing.md },
  field: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radius.lg, paddingHorizontal: spacing.md },
  input: { flex: 1, fontSize: 17, paddingVertical: spacing.md },
  toggle: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  result: { gap: spacing.xs },
  more: { marginTop: spacing.lg },
});
