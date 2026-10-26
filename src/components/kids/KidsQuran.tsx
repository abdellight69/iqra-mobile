import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Card } from "@/components/Card";
import { BigButton } from "@/components/kids/KidButton";
import { KidVoiceButton } from "@/components/kids/KidVoiceButton";
import { ProgressBar } from "@/components/ProgressBar";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/States";
import { KID_TONES, KIDS, useKidsColors, type KidTone } from "@/lib/kids";
import { KIDS_SURAHS, useFinishedSurahs } from "@/lib/kids-quran";
import { useChapters, useMe, useReadingPosition } from "@/lib/queries";
import { elevation, radius, spacing, useColors } from "@/lib/theme";
import type { Chapter } from "@/lib/types";

/** Pastilles de couleur des petites sourates, dans l'ordre de la grille. */
const TILE_TONES: KidTone[] = ["green", "blue", "violet", "orange", "pink", "sun"];

const openSurah = (id: number, verse?: number) => router.push({ pathname: "/surah/[id]", params: verse ? { id: String(id), verse: String(verse) } : { id: String(id) } });

/**
 * Onglet Coran d'un profil enfant : reprendre la lecture, les petites sourates en grandes tuiles,
 * et les 114 sourates sur demande. Pas de recherche, de filtres ni de signets.
 */
export function KidsQuran() {
  const colors = useColors();
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
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="display">Le Coran</AppText>
          <AppText variant="bodyStrong" muted>
            Choisis une sourate et écoute-la.
          </AppText>
        </View>
        <KidVoiceButton text={`Le Coran. Choisis une sourate et écoute-la.${current ? ` Touche la carte bleue pour continuer ${current.nameSimple}.` : ""}`} />
      </View>

      {current && position.data ? (
        <Card style={[styles.resume, { backgroundColor: KID_TONES.blue.main }]} onPress={() => openSurah(current.id, position.data!.verseNumber)}>
          <View style={styles.flex}>
            <AppText variant="label" color={KIDS.onHeroMuted}>
              Continuer
            </AppText>
            <AppText variant="title" color={KIDS.onHero}>
              {current.nameSimple}
            </AppText>
            <AppText variant="caption" color={KIDS.onHeroMuted}>
              Verset {position.data.verseNumber} sur {current.versesCount}
            </AppText>
            <ProgressBar value={position.data.verseNumber / current.versesCount} color={KIDS.sun} track={KIDS.veil} height={8} />
          </View>
          <View style={[styles.play, { backgroundColor: KIDS.sun, borderBottomColor: KIDS.sunStroke }]} aria-hidden>
            <Ionicons name="play" size={32} color={KIDS.sunInk} />
          </View>
        </Card>
      ) : null}

      <AppText variant="title">Mes petites sourates</AppText>
      <View style={styles.grid}>
        {KIDS_SURAHS.map((id, i) => {
          const chapter = byId.get(id);
          return chapter ? <SurahTile key={id} chapter={chapter} done={finished.has(id)} tone={TILE_TONES[i % TILE_TONES.length]!} /> : null;
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
        <BigButton title="Voir les 114 sourates" icon="chevron-down" tone="white" size="md" onPress={() => setAll(true)} />
      )}
    </Screen>
  );
}

/** Tuile blanche d'une sourate : son numéro sur sa pastille, son nom, une étoile quand elle a été lue jusqu'au bout. */
function SurahTile({ chapter, done, tone }: { chapter: Chapter; done: boolean; tone: KidTone }) {
  const colors = useColors();
  const kc = useKidsColors();
  const tint = kc.tint(tone);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${chapter.nameSimple}, ${chapter.versesCount} versets${done ? ", déjà lue" : ""}`}
      onPress={() => openSurah(chapter.id)}
      style={({ pressed }) => [styles.tile, { backgroundColor: colors.surface, transform: [{ scale: pressed ? 0.97 : 1 }] }, elevation(colors)]}>
      <View style={styles.tileTop}>
        <View style={[styles.tileNumber, { backgroundColor: tint.bg }]}>
          <AppText variant="bodyStrong" color={tint.ink}>
            {chapter.id}
          </AppText>
        </View>
        {done ? (
          <Ionicons name="star" size={26} color={KIDS.sun} />
        ) : (
          <ArabicText size="md" color={colors.textMuted}>
            {chapter.nameArabic}
          </ArabicText>
        )}
      </View>
      <View>
        <AppText variant="headline" numberOfLines={1}>
          {chapter.nameSimple}
        </AppText>
        <AppText variant="caption" muted>
          {chapter.versesCount} versets
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  resume: { flexDirection: "row", alignItems: "center", gap: spacing.lg, borderRadius: radius.xl },
  // Toute la carte est le bouton : le disque jaune n'est qu'un dessin (pas de bouton dans un bouton).
  play: { width: 72, height: 77, borderRadius: 36, borderBottomWidth: 5, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  tile: { width: "47%", flexGrow: 1, minHeight: 112, borderRadius: 24, padding: spacing.md, justifyContent: "space-between", gap: spacing.md },
  tileTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tileNumber: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, minHeight: 56 },
  number: { width: 28 },
});
