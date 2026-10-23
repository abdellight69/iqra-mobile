import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/States";
import { KIDS, useKidsColors } from "@/lib/kids";
import { KIDS_SURAHS, useFinishedSurahs } from "@/lib/kids-quran";
import { useChapters, useMe, useReadingPosition } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import type { Chapter } from "@/lib/types";

const openSurah = (id: number, verse?: number) => router.push({ pathname: "/surah/[id]", params: verse ? { id: String(id), verse: String(verse) } : { id: String(id) } });

/**
 * Onglet Coran d'un profil enfant : reprendre la lecture, les petites sourates en grandes tuiles,
 * et les 114 sourates sur demande. Pas de recherche, de filtres ni de signets.
 */
export function KidsQuran() {
  const colors = useColors();
  const kc = useKidsColors();
  const me = useMe();
  const chapters = useChapters();
  const position = useReadingPosition();
  const { finished } = useFinishedSurahs(me.data?.id);
  const [all, setAll] = useState(false);

  if (chapters.isPending) return <LoadingState />;
  if (chapters.isError) return <ErrorState error={chapters.error} onRetry={() => void chapters.refetch()} />;
  const byId = new Map(chapters.data.map((c) => [c.id, c]));
  const current = position.data ? byId.get(position.data.chapterId) : undefined;

  return (
    <Screen refreshing={position.isRefetching} onRefresh={() => void position.refetch()}>
      <View>
        <AppText variant="display">Le Coran</AppText>
        <AppText variant="bodyStrong" muted>
          Choisis une sourate et écoute-la.
        </AppText>
      </View>

      {current && position.data ? (
        <Card tone="primary" style={styles.resume} onPress={() => openSurah(current.id, position.data!.verseNumber)}>
          <View style={styles.flex}>
            <AppText variant="label" color={KIDS.sun}>
              Continuer
            </AppText>
            <AppText variant="title" color={KIDS.onHero}>
              {current.nameSimple}
            </AppText>
            <AppText color={KIDS.onHero} style={styles.soft}>
              Verset {position.data.verseNumber} sur {current.versesCount}
            </AppText>
            <ProgressBar value={position.data.verseNumber / current.versesCount} color={KIDS.sun} track="rgba(255,255,255,0.25)" height={8} />
          </View>
          <View style={[styles.play, { backgroundColor: KIDS.sun }]} accessibilityLabel={`Continuer la lecture de ${current.nameSimple}`}>
            <Ionicons name="play" size={30} color={KIDS.sunInk} />
          </View>
        </Card>
      ) : null}

      <AppText variant="title">Mes petites sourates</AppText>
      <View style={styles.grid}>
        {KIDS_SURAHS.map((id, i) => {
          const chapter = byId.get(id);
          return chapter ? <SurahTile key={id} chapter={chapter} done={finished.has(id)} tint={i % 2 === 0 ? colors.primarySoft : kc.sunSoft} /> : null;
        })}
      </View>

      {all ? (
        <Card padded={false}>
          {chapters.data.map((c, i) => (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              onPress={() => openSurah(c.id)}
              style={({ pressed }) => [styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, { opacity: pressed ? 0.6 : 1 }]}>
              <AppText variant="bodyStrong" muted style={styles.number}>
                {c.id}
              </AppText>
              <AppText variant="bodyStrong" style={styles.flex}>
                {c.nameSimple}
              </AppText>
              {finished.has(c.id) ? <Ionicons name="star" size={18} color={KIDS.sun} /> : null}
              <ArabicText size="sm">{c.nameArabic}</ArabicText>
            </Pressable>
          ))}
        </Card>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setAll(true)} style={[styles.more, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <AppText variant="bodyStrong">Voir les 114 sourates</AppText>
          <Ionicons name="chevron-down" size={18} color={colors.text} />
        </Pressable>
      )}
    </Screen>
  );
}

function SurahTile({ chapter, done, tint }: { chapter: Chapter; done: boolean; tint: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${chapter.nameSimple}, ${chapter.versesCount} versets${done ? ", déjà lue" : ""}`}
      onPress={() => openSurah(chapter.id)}
      style={({ pressed }) => [styles.tile, { backgroundColor: tint, opacity: pressed ? 0.8 : 1 }]}>
      <View style={styles.tileTop}>
        <AppText variant="caption" muted>
          {chapter.versesCount} versets
        </AppText>
        {done ? <Ionicons name="star" size={22} color={KIDS.sun} /> : null}
      </View>
      <ArabicText size="md" style={styles.tileArabic}>
        {chapter.nameArabic}
      </ArabicText>
      <AppText variant="headline" numberOfLines={1}>
        {chapter.nameSimple}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  soft: { opacity: 0.85 },
  resume: { flexDirection: "row", alignItems: "center", gap: spacing.lg, borderRadius: radius.xl },
  play: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  tile: { width: "47%", flexGrow: 1, minHeight: 112, borderRadius: radius.lg, padding: spacing.md, justifyContent: "space-between" },
  tileTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tileArabic: { textAlign: "right" },
  more: { minHeight: 52, borderRadius: radius.pill, borderWidth: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, minHeight: 56 },
  number: { width: 28 },
});
