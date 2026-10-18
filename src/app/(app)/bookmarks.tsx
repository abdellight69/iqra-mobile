import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Card } from "@/components/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { VerseBadge } from "@/components/VerseBadge";
import { useBookmarks, useChapters, useToggleBookmark } from "@/lib/queries";
import { spacing, useColors } from "@/lib/theme";

export default function Bookmarks() {
  const colors = useColors();
  const bookmarks = useBookmarks();
  const chapters = useChapters();
  const toggle = useToggleBookmark();

  if (bookmarks.isPending) return <LoadingState />;
  if (bookmarks.isError) return <ErrorState error={bookmarks.error} onRetry={() => void bookmarks.refetch()} />;

  return (
    <FlatList
      data={bookmarks.data}
      keyExtractor={(b) => b.id}
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      ListEmptyComponent={
        <EmptyState icon="bookmark-outline" title="Aucun signet" message="Touchez l'icône signet d'un verset pendant la lecture pour le retrouver ici." />
      }
      renderItem={({ item }) => {
        const chapter = chapters.data?.find((c) => c.id === item.chapterId);
        return (
          <Card
            onPress={() => router.push({ pathname: "/surah/[id]", params: { id: String(item.chapterId), verse: String(item.verseNumber) } })}
            style={styles.row}>
            <VerseBadge value={item.verseNumber} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{chapter ? chapter.nameSimple : `Sourate ${item.chapterId}`}</AppText>
              <AppText variant="caption" muted>
                {item.note ?? `Verset ${item.chapterId}:${item.verseNumber}`}
              </AppText>
            </View>
            {chapter ? <ArabicText size="sm">{chapter.nameArabic}</ArabicText> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retirer le signet"
              hitSlop={8}
              onPress={() => toggle.mutate({ chapterId: item.chapterId, verseNumber: item.verseNumber, existingId: item.id })}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          </Card>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, flexGrow: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
});
