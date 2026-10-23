import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { type ComponentProps, useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Card } from "@/components/Card";
import { BigButton } from "@/components/kids/KidsHome";
import { ProgressBar } from "@/components/ProgressBar";
import { Screen } from "@/components/Screen";
import { KIDS, useKidsColors } from "@/lib/kids";
import { useLearnedWords } from "@/lib/missions";
import { useStats, useThemes } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import type { ThemeSummary } from "@/lib/types";

type Icon = ComponentProps<typeof Ionicons>["name"];

/** Thèmes montrés d'abord ; « Tout voir » ouvre les autres. */
const FIRST_THEMES = 4;

/**
 * Onglet Mots d'un profil enfant : le jeu du jour, « Mes mots », des thèmes en grandes tuiles et
 * l'apprentissage des lettres. Ni parcours par sourate, ni fiches du livre, ni statistiques.
 */
export function KidsWords() {
  const colors = useColors();
  const kc = useKidsColors();
  const stats = useStats();
  const themes = useThemes();
  const words = useLearnedWords();
  const [all, setAll] = useState(false);
  const refetchStats = stats.refetch;
  const refetchWords = words.refetch;
  useFocusEffect(
    useCallback(() => {
      void refetchStats();
      void refetchWords();
    }, [refetchStats, refetchWords]),
  );

  const due = stats.data?.vocabulary.due ?? 0;
  const list = themes.data ?? [];
  const shown = all ? list : list.slice(0, FIRST_THEMES);
  const latest = (words.data ?? []).slice(0, 2).map((w) => w.headword ?? w.ar).filter((w): w is string => Boolean(w));

  return (
    <Screen
      refreshing={stats.isRefetching || themes.isRefetching}
      onRefresh={() => {
        void stats.refetch();
        void themes.refetch();
        void words.refetch();
      }}>
      <View>
        <AppText variant="display">Mots</AppText>
        <AppText variant="bodyStrong" muted>
          Joue et découvre les mots du Coran.
        </AppText>
      </View>

      <Card tone="primary" style={styles.game}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <AppText variant="label" color={KIDS.sun}>
              Le jeu du jour
            </AppText>
            <AppText variant="title" color={KIDS.onHero}>
              De nouveaux mots
            </AppText>
            <AppText color={KIDS.onHero} style={styles.soft}>
              {due > 0 ? `Environ 3 minutes · ${due} mot${due > 1 ? "s" : ""} à revoir` : "Environ 3 minutes"}
            </AppText>
          </View>
          <View style={styles.gameIcon}>
            <Ionicons name="shapes" size={30} color={KIDS.onHero} />
          </View>
        </View>
        <BigButton title="Jouer" icon="play" onPress={() => router.push({ pathname: "/learn/session", params: { daily: "1" } })} />
      </Card>

      <Card onPress={() => router.push("/mes-mots")} style={styles.row}>
        <View style={[styles.square, { backgroundColor: kc.sunSoft }]}>
          <Ionicons name="albums" size={28} color={KIDS.sunStroke} />
        </View>
        <View style={styles.flex}>
          <AppText variant="headline">Mes mots</AppText>
          <AppText muted>{words.data?.length ? `${words.data.length} mot${words.data.length > 1 ? "s" : ""} dans ta collection` : "Tes mots appris arrivent ici"}</AppText>
        </View>
        {latest.map((w) => (
          <View key={w} style={[styles.chip, { backgroundColor: colors.surfaceMuted }]}>
            <ArabicText size="sm">{w}</ArabicText>
          </View>
        ))}
      </Card>

      <View style={styles.titleRow}>
        <AppText variant="title">Choisis un thème</AppText>
        {list.length > FIRST_THEMES ? (
          <Pressable accessibilityRole="button" hitSlop={10} onPress={() => setAll(!all)} style={styles.toggle}>
            <AppText variant="bodyStrong" color={colors.primary}>
              {all ? "Moins" : `Tout voir (${list.length})`}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.grid}>
        {shown.map((theme, i) => (
          <ThemeTile key={theme.id} theme={theme} tint={i % 3 === 0 ? colors.primarySoft : kc.sunSoft} />
        ))}
      </View>

      <Card onPress={() => router.push("/reading")} style={styles.row}>
        <View style={[styles.square, { backgroundColor: colors.primarySoft }]}>
          <ArabicText size="sm" color={colors.primary}>
            ا ب
          </ArabicText>
        </View>
        <View style={styles.flex}>
          <AppText variant="headline">Apprendre les lettres</AppText>
          <AppText muted>Pour lire l’arabe tout seul</AppText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Card>
    </Screen>
  );
}

function ThemeTile({ theme, tint }: { theme: ThemeSummary; tint: string }) {
  const colors = useColors();
  const icon = (theme.icon && theme.icon in Ionicons.glyphMap ? theme.icon : "book-outline") as Icon;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${theme.title}, ${theme.learnedCount} mots sur ${theme.wordCount}`}
      onPress={() => router.push({ pathname: "/learn/theme/[themeId]", params: { themeId: theme.id } })}
      style={({ pressed }) => [styles.tile, { backgroundColor: tint, opacity: pressed ? 0.8 : 1 }]}>
      <View style={[styles.tileIcon, { backgroundColor: colors.surface }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <AppText variant="headline" numberOfLines={2}>
        {theme.title}
      </AppText>
      <View style={styles.row}>
        <View style={styles.flex}>
          <ProgressBar value={theme.wordCount ? theme.learnedCount / theme.wordCount : 0} height={6} />
        </View>
        <AppText variant="caption" muted>
          {theme.learnedCount}/{theme.wordCount}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  soft: { opacity: 0.85 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  game: { gap: spacing.lg, borderRadius: radius.xl },
  gameIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.14)" },
  square: { width: 52, height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  chip: { borderRadius: radius.sm, paddingHorizontal: spacing.sm },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toggle: { minHeight: 44, justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  tile: { width: "47%", flexGrow: 1, minHeight: 112, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, justifyContent: "space-between" },
  tileIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
