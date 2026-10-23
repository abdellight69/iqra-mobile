import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorState, LoadingState } from "@/components/States";
import { TextField } from "@/components/TextField";
import { errorMessage } from "@/lib/api";
import { useKidsColors, useKidsMode } from "@/lib/kids";
import { KIDS_SURAHS } from "@/lib/kids-quran";
import { useChapters, useCreatePlan } from "@/lib/queries";
import { fonts, radius, spacing, useColors } from "@/lib/theme";
import type { Chapter } from "@/lib/types";

export default function NewPlan() {
  const colors = useColors();
  const chapters = useChapters();
  const create = useCreatePlan();
  // Depuis la carte de mémorisation, la sourate est déjà choisie.
  const params = useLocalSearchParams<{ chapterId?: string }>();
  const [picked, setChapter] = useState<Chapter | null>(null);
  const chapter = picked ?? chapters.data?.find((c) => String(c.id) === params.chapterId) ?? null;
  const [mode, setMode] = useState<"whole" | "range">("whole");
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const kids = useKidsMode();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (chapters.data ?? []).filter((c) => !q || String(c.id) === q || c.nameSimple.toLowerCase().includes(q));
  }, [chapters.data, query]);

  if (chapters.isPending) return <LoadingState />;
  if (chapters.isError) return <ErrorState error={chapters.error} onRetry={() => void chapters.refetch()} />;
  if (kids) return <KidsSurahPicker chapters={chapters.data} />;

  if (!chapter) {
    return (
      <View style={styles.flex}>
        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher une sourate"
            accessibilityLabel="Rechercher une sourate"
            placeholderTextColor={colors.textMuted}
            style={[styles.search, { color: colors.text, backgroundColor: colors.surfaceMuted }]}
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setChapter(item);
                setTo(String(item.versesCount));
              }}
              style={({ pressed }) => [styles.row, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}>
              <AppText variant="bodyStrong" style={styles.flex}>
                {item.id}. {item.nameSimple}
                <AppText variant="caption" muted>
                  {"  "}
                  {item.versesCount} versets
                </AppText>
              </AppText>
              <ArabicText size="sm">{item.nameArabic}</ArabicText>
            </Pressable>
          )}
        />
      </View>
    );
  }

  const fromN = Number(from);
  const toN = Number(to);
  const rangeValid = Number.isInteger(fromN) && Number.isInteger(toN) && fromN >= 1 && toN <= chapter.versesCount && fromN <= toN;

  return (
    <View style={[styles.flex, styles.form]}>
      <Card style={styles.selected}>
        <View style={styles.flex}>
          <AppText variant="heading">
            {chapter.id}. {chapter.nameSimple}
          </AppText>
          <AppText variant="caption" muted>
            {chapter.versesCount} versets
          </AppText>
        </View>
        <ArabicText size="md">{chapter.nameArabic}</ArabicText>
      </Card>
      <Button title="Changer de sourate" variant="ghost" size="md" onPress={() => setChapter(null)} />

      <View style={[styles.segmented, { backgroundColor: colors.surfaceMuted }]}>
        {(["whole", "range"] as const).map((m) => (
          <Pressable
            key={m}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === m }}
            onPress={() => setMode(m)}
            style={[styles.segment, mode === m && { backgroundColor: colors.surface }]}>
            <AppText variant="bodyStrong" color={mode === m ? colors.primary : colors.textMuted}>
              {m === "whole" ? "Sourate entière" : "Quelques versets"}
            </AppText>
          </Pressable>
        ))}
      </View>

      {mode === "range" ? (
        <View style={styles.rangeRow}>
          <View style={styles.flex}>
            <TextField label="Du verset" value={from} onChangeText={setFrom} keyboardType="number-pad" />
          </View>
          <View style={styles.flex}>
            <TextField label="Au verset" value={to} onChangeText={setTo} keyboardType="number-pad" />
          </View>
        </View>
      ) : null}
      {mode === "range" && !rangeValid ? (
        <AppText variant="caption" color={colors.danger}>
          Choisissez des versets entre 1 et {chapter.versesCount}.
        </AppText>
      ) : null}
      {create.isError ? <AppText color={colors.danger}>{errorMessage(create.error)}</AppText> : null}

      <Button
        title="Créer le plan"
        loading={create.isPending}
        disabled={mode === "range" && !rangeValid}
        onPress={() =>
          create.mutate(mode === "whole" ? { chapterId: chapter.id } : { chapterId: chapter.id, fromVerse: fromN, toVerse: toN }, {
            onSuccess: ({ plan }) => router.replace({ pathname: "/memorize/[planId]", params: { planId: plan.id } }),
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchWrap: { padding: spacing.lg, paddingBottom: 0 },
  search: { borderRadius: radius.pill, paddingHorizontal: spacing.lg, minHeight: 48, fontFamily: fonts.regular, fontSize: 15 },
  list: { padding: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.md },
  form: { padding: spacing.lg, gap: spacing.md },
  selected: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  segmented: { flexDirection: "row", borderRadius: radius.pill, padding: 4 },
  segment: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: radius.pill },
  rangeRow: { flexDirection: "row", gap: spacing.md },
  kidsContent: { padding: spacing.lg, gap: spacing.lg },
  kidsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  kidsTile: { width: "47%", flexGrow: 1, minHeight: 112, borderRadius: radius.lg, padding: spacing.md, justifyContent: "space-between" },
  kidsArabic: { textAlign: "right" },
});

/**
 * Profil enfant : les petites sourates en grandes tuiles ; un appui crée le plan de la sourate
 * entière et lance tout de suite la première séance.
 */
function KidsSurahPicker({ chapters }: { chapters: Chapter[] }) {
  const colors = useColors();
  const kc = useKidsColors();
  const create = useCreatePlan();
  const byId = new Map(chapters.map((c) => [c.id, c]));
  return (
    <ScrollView contentContainerStyle={styles.kidsContent}>
      <AppText variant="title">Quelle sourate veux-tu apprendre ?</AppText>
      {create.isError ? <AppText color={colors.danger}>{errorMessage(create.error)}</AppText> : null}
      <View style={styles.kidsGrid}>
        {KIDS_SURAHS.map((id, i) => {
          const c = byId.get(id);
          if (!c) return null;
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={`Apprendre ${c.nameSimple}, ${c.versesCount} versets`}
              disabled={create.isPending}
              onPress={() =>
                create.mutate({ chapterId: c.id }, { onSuccess: ({ plan }) => router.replace({ pathname: "/memorize/session", params: { planId: plan.id } }) })
              }
              style={({ pressed }) => [styles.kidsTile, { backgroundColor: i % 2 === 0 ? colors.primarySoft : kc.sunSoft, opacity: pressed || create.isPending ? 0.7 : 1 }]}>
              <AppText variant="caption" muted>
                {c.versesCount} versets
              </AppText>
              <ArabicText size="md" style={styles.kidsArabic}>
                {c.nameArabic}
              </ArabicText>
              <AppText variant="headline" numberOfLines={1}>
                {c.nameSimple}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
