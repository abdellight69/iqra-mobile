import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Card } from "@/components/Card";
import { useOneShot } from "@/lib/audio";
import { useRootOccurrences, useWordDetails } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import type { Label, Segment } from "@/lib/types";

const LANGUAGES: Record<string, string> = { french: "français", english: "anglais", arabic: "arabe" };
const POSITIONS: Record<Segment["position"], string> = { prefix: "Préfixe", stem: "Mot", suffix: "Suffixe" };

export default function WordSheet() {
  const colors = useColors();
  const params = useLocalSearchParams<{
    location: string;
    text?: string;
    transliteration?: string;
    translation?: string;
    language?: string;
    audio?: string;
  }>();
  const details = useWordDetails(params.location);
  const sound = useOneShot();
  const [showOccurrences, setShowOccurrences] = useState(false);
  const morphology = details.data?.morphology;
  const occurrences = useRootOccurrences(showOccurrences ? (morphology?.root ?? null) : null);
  const [chapter, verse, position] = params.location.split(":");
  const language = params.language ? (LANGUAGES[params.language] ?? params.language) : null;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <AppText variant="label" muted center>
          {chapter}:{verse} · mot {position}
        </AppText>
        <ArabicText size={60} center>
          {params.text}
        </ArabicText>
        {params.audio ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Écouter la prononciation"
            onPress={() => sound.play(params.audio!)}
            style={({ pressed }) => [styles.listen, { backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.7 : 1 }]}>
            <Ionicons name={sound.playing ? "volume-high" : "play"} size={15} color={colors.text} />
            <AppText variant="caption">Écouter</AppText>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.pair, { borderColor: colors.border }]}>
        <View style={styles.flex}>
          <AppText variant="label" muted>
            Phonétique
          </AppText>
          <AppText variant="headline" italic color={colors.accent}>
            {params.transliteration || "—"}
          </AppText>
        </View>
        <View style={[styles.pairDivider, { backgroundColor: colors.border }]} />
        <View style={styles.flex}>
          <AppText variant="label" muted>
            Traduction{language ? ` · ${language}` : ""}
          </AppText>
          <AppText variant="headline">{params.translation || "—"}</AppText>
        </View>
      </View>

      {details.isPending ? (
        <ActivityIndicator color={colors.primary} />
      ) : !morphology ? (
        <Card>
          <AppText muted>Analyse grammaticale indisponible pour ce mot.</AppText>
        </Card>
      ) : (
        <>
          <Card style={styles.section}>
            <AppText variant="headline">Définition grammaticale</AppText>
            {morphology.segments.map((segment, i) => (
              <SegmentRow key={i} segment={segment} />
            ))}
          </Card>

          {morphology.root || morphology.lemma ? (
            <Card style={styles.section}>
              {morphology.root ? (
                <View style={styles.kv}>
                  <View style={styles.flex}>
                    <AppText variant="label" muted>
                      Racine
                    </AppText>
                    <AppText variant="caption" muted>
                      {morphology.rootOccurrences} occurrences dans le Coran
                    </AppText>
                  </View>
                  <ArabicText size="lg">{morphology.root.split("").join(" ")}</ArabicText>
                </View>
              ) : null}
              {morphology.lemma ? (
                <View style={styles.kv}>
                  <View style={styles.flex}>
                    <AppText variant="label" muted>
                      Lemme (forme de base)
                    </AppText>
                    <AppText variant="caption" muted>
                      {morphology.lemmaOccurrences} occurrences dans le Coran
                    </AppText>
                  </View>
                  <ArabicText size="lg">{morphology.lemma}</ArabicText>
                </View>
              ) : null}
              {morphology.root ? (
                <Pressable accessibilityRole="button" onPress={() => setShowOccurrences((s) => !s)} style={styles.link}>
                  <AppText variant="bodyStrong" color={colors.primary}>
                    {showOccurrences ? "Masquer les occurrences" : "Voir les versets de cette racine"}
                  </AppText>
                </Pressable>
              ) : null}
              {showOccurrences ? (
                occurrences.isPending ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <View style={styles.occurrences}>
                    {occurrences.data?.occurrences.map((o) => (
                      <Pressable
                        key={o.location}
                        accessibilityRole="button"
                        onPress={() => {
                          const [c, v] = o.verseKey.split(":");
                          router.dismiss();
                          router.push({ pathname: "/surah/[id]", params: { id: c!, verse: v! } });
                        }}
                        style={[styles.occurrence, { borderColor: colors.border }]}>
                        <ArabicText size="sm">{o.form}</ArabicText>
                        <AppText variant="caption" muted>
                          {o.verseKey}
                        </AppText>
                      </Pressable>
                    ))}
                    {occurrences.data && occurrences.data.total > occurrences.data.occurrences.length ? (
                      <AppText variant="caption" muted>
                        … et {occurrences.data.total - occurrences.data.occurrences.length} autres
                      </AppText>
                    ) : null}
                  </View>
                )
              ) : null}
            </Card>
          ) : null}
        </>
      )}

      {details.data?.vocabulary.length ? (
        <Card tone="accent" style={styles.section}>
          <AppText variant="headline">Dans le lexique « 80% des mots du Qour’ân »</AppText>
          {details.data.vocabulary.map((v) => (
            <Pressable
              key={v.wordId}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: "/learn/[lessonId]", params: { lessonId: v.lessonId } })}
              style={styles.kv}>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{v.fr}</AppText>
                <AppText variant="caption" muted>
                  {v.lessonTitle} · p. {v.sourcePage}
                </AppText>
              </View>
              {v.ar ? <ArabicText size="md">{v.ar}</ArabicText> : null}
            </Pressable>
          ))}
          <AppText variant="caption" muted>
            Correspondance établie sur l’écriture du lemme : vérifiez que le sens convient au contexte.
          </AppText>
        </Card>
      ) : null}

      <AppText variant="caption" faint center>
        Phonétique, traduction mot à mot et audio : Quran.com (Quran Foundation).{"\n"}Analyse grammaticale : Quranic Arabic
        Corpus (corpus.quran.com).
      </AppText>
    </ScrollView>
  );
}

function SegmentRow({ segment }: { segment: Segment }) {
  const colors = useColors();
  const nature: Label = segment.category ?? segment.partOfSpeech;
  const chips: Label[] = [...(segment.verbForm ? [segment.verbForm] : []), ...segment.features, ...(segment.family ? [segment.family] : [])];
  return (
    <View style={[styles.segment, { borderColor: colors.border }]}>
      <View style={styles.kv}>
        <View style={styles.flex}>
          <AppText variant="caption" muted>
            {POSITIONS[segment.position]}
          </AppText>
          <AppText variant="bodyStrong">{nature.fr}</AppText>
          <AppText variant="caption" muted>
            {nature.ar}
          </AppText>
        </View>
        {segment.form ? <ArabicText size="lg">{segment.form}</ArabicText> : null}
      </View>
      {chips.length > 0 ? (
        <View style={styles.chips}>
          {chips.map((chip) => (
            <View key={chip.code} style={[styles.chip, { backgroundColor: colors.primarySoft }]}>
              <AppText variant="caption" color={colors.primaryStrong}>
                {chip.fr}
                {chip.ar ? ` · ${chip.ar}` : ""}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 4 },
  content: { paddingHorizontal: spacing.xl - 4, paddingTop: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl * 2 },
  hero: { alignItems: "center", gap: spacing.xs, paddingBottom: spacing.sm },
  listen: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill },
  pair: { flexDirection: "row", gap: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.lg },
  pairDivider: { width: StyleSheet.hairlineWidth },
  section: { gap: spacing.md },
  kv: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  segment: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md, gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill },
  link: { alignSelf: "flex-start", paddingVertical: spacing.xs },
  occurrences: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  occurrence: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.sm, paddingHorizontal: spacing.sm, alignItems: "center" },
});
