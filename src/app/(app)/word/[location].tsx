import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Card } from "@/components/Card";
import { API_URL } from "@/lib/api";
import { useOneShot } from "@/lib/audio";
import { isFrench } from "@/lib/language";
import { useRootOccurrences, useWordDetails } from "@/lib/queries";
import { useReaderSettings } from "@/lib/reader-store";
import { explainLabel, explainSegment, LEMMA_HELP, ROOT_HELP, SEGMENTS_INTRO } from "@/lib/grammar-help";
import { TAJWEED_GLOSSARY, TAJWEED_RULES, tajweedColor, type TajweedRule } from "@/lib/tajweed";
import { radius, spacing, useColors } from "@/lib/theme";
import type { Label, Segment } from "@/lib/types";

const LANGUAGES: Record<string, string> = { french: "français", english: "anglais", arabic: "arabe" };
const WORD_LOCATION = /^\d{1,3}:\d{1,3}:\d{1,3}$/;
/** Hôtes d'où l'app accepte de lire un audio reçu en paramètre : l'API, et les CDN de Quran.com. */
function isTrustedAudioUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:" && !(protocol === "http:" && API_URL.startsWith("http://"))) return false;
    return hostname === new URL(API_URL).hostname || hostname.endsWith(".qurancdn.com") || hostname.endsWith(".quran.com") || hostname === "verses.quran.com";
  } catch {
    return false;
  }
}
const POSITIONS: Record<Segment["position"], string> = { prefix: "Préfixe", stem: "Mot", suffix: "Suffixe" };

export default function WordSheet() {
  const colors = useColors();
  const params = useLocalSearchParams<{
    location: string;
    text?: string;
    transliteration?: string;
    tajweed?: string;
    segments?: string;
    translation?: string;
    language?: string;
    audio?: string;
  }>();
  const dark = useColorScheme() === "dark";
  const tajweedRules = (params.tajweed ?? "")
    .split(",")
    .map((code) => TAJWEED_RULES[code])
    .filter((rule): rule is TajweedRule => rule !== undefined);
  const segments = parseSegments(params.segments);
  // Termes du glossaire cités par les règles présentes sur ce mot.
  const tajweedText = tajweedRules.map((r) => `${r.name} ${r.description} ${r.how}`).join(" ").toLowerCase();
  const glossary = TAJWEED_GLOSSARY.filter((g) => tajweedText.includes(g.term.split(" ")[0]!.toLowerCase()));
  const [showGlossary, setShowGlossary] = useState(false);
  // Tajwid activé dans le lecteur : le mot de la fiche garde les mêmes couleurs.
  const tajweedOn = useReaderSettings((r) => r.showTajweed);
  const colorHero = tajweedOn && segments.length > 0;
  // Lien profond : la position doit avoir la forme sourate:verset:mot, et l'audio venir de l'API ou du CDN
  // de Quran.com (jamais une adresse arbitraire).
  const location = WORD_LOCATION.test(params.location ?? "") ? params.location : "";
  const audioUrl = params.audio && isTrustedAudioUrl(params.audio) ? params.audio : null;
  const details = useWordDetails(location);
  const sound = useOneShot();
  const [showOccurrences, setShowOccurrences] = useState(false);
  const morphology = details.data?.morphology;
  const occurrences = useRootOccurrences(showOccurrences ? (morphology?.root ?? null) : null);
  const [chapter, verse, position] = location.split(":");
  const language = params.language ? (isFrench(params.language) ? "français" : (LANGUAGES[params.language.toLowerCase()] ?? params.language)) : null;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <AppText variant="label" muted center>
          {chapter}:{verse} · mot {position}
        </AppText>
        <ArabicText size={60} center accessibilityLabel={params.text}>
          {colorHero
            ? segments.map((segment, i) => (
                <Text key={i} style={{ color: tajweedColor(segment.rule, dark) }}>
                  {segment.text}
                </Text>
              ))
            : params.text}
        </ArabicText>
        {audioUrl ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Écouter la prononciation"
            onPress={() => sound.play(audioUrl)}
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

      {tajweedRules.length > 0 ? (
        <Card style={styles.section}>
          <AppText variant="headline">Tajwid</AppText>
          <AppText variant="caption" muted>
            {"Les lettres colorées montrent où chaque règle s'applique dans le mot."}
          </AppText>
          {segments.length > 0 && !colorHero ? (
            <ArabicText size={40} center accessibilityLabel={params.text}>
              {segments.map((segment, i) => (
                <Text key={i} style={{ color: tajweedColor(segment.rule, dark) }}>
                  {segment.text}
                </Text>
              ))}
            </ArabicText>
          ) : null}
          {tajweedRules.map((rule) => (
            <View key={rule.name} style={styles.tajweedRow}>
              <View style={[styles.tajweedDot, { backgroundColor: dark ? rule.dark : rule.light }]} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong" color={dark ? rule.dark : rule.light}>
                  {rule.name}
                </AppText>
                <AppText variant="caption" muted>
                  {rule.description}
                </AppText>
                <AppText variant="caption">
                  <AppText variant="caption" muted>
                    Comment faire :{" "}
                  </AppText>
                  {rule.how}
                </AppText>
              </View>
            </View>
          ))}
          {glossary.length > 0 ? (
            <View style={[styles.glossary, { borderColor: colors.border }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showGlossary }}
                onPress={() => setShowGlossary((s) => !s)}
                style={styles.glossaryHeader}>
                <Ionicons name="help-circle-outline" size={16} color={colors.textMuted} />
                <AppText variant="caption" style={styles.flex}>
                  Les mots du tajwid : {glossary.map((g) => g.term.split(" ")[0]).join(", ")}
                </AppText>
                <Ionicons name={showGlossary ? "chevron-up" : "chevron-down"} size={14} color={colors.textMuted} />
              </Pressable>
              {showGlossary
                ? glossary.map((g) => (
                    <AppText key={g.term} variant="caption" muted>
                      <AppText variant="caption">{g.term}</AppText> — {g.definition}
                    </AppText>
                  ))
                : null}
            </View>
          ) : null}
        </Card>
      ) : null}

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
            {morphology.segments.length > 1 ? (
              <AppText variant="caption" muted>
                {SEGMENTS_INTRO}
              </AppText>
            ) : null}
            <AppText variant="caption" muted>
              Touchez une étiquette pour la comprendre.
            </AppText>
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
                    <AppText variant="caption" faint>
                      {ROOT_HELP}
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
                    <AppText variant="caption" faint>
                      {LEMMA_HELP}
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
        Phonétique, traduction mot à mot, tajwid et audio : Quran.com (Quran Foundation).{"\n"}Analyse grammaticale : Quranic Arabic
        Corpus (corpus.quran.com).
      </AppText>
    </ScrollView>
  );
}

/** Découpage tajwid transmis par le lecteur (JSON) ; vide si absent ou illisible. */
function parseSegments(raw: string | undefined): { text: string; rule: string | null }[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is { text: string; rule: string | null } => typeof s?.text === "string") : [];
  } catch {
    return [];
  }
}

function SegmentRow({ segment }: { segment: Segment }) {
  const colors = useColors();
  const nature: Label = segment.category ?? segment.partOfSpeech;
  const chips: Label[] = [...(segment.verbForm ? [segment.verbForm] : []), ...segment.features, ...(segment.family ? [segment.family] : [])];
  const [selected, setSelected] = useState<string | null>(null);
  const selectedChip = chips.find((c) => c.code === selected);
  const definition = selectedChip ? explainLabel(selectedChip, "feature") : null;
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
      <AppText variant="caption">
        <AppText variant="caption" muted>
          En clair :{" "}
        </AppText>
        {explainSegment(segment)}
      </AppText>
      {chips.length > 0 ? (
        <View style={styles.chips}>
          {chips.map((chip) => {
            const active = chip.code === selected;
            return (
              <Pressable
                key={chip.code}
                accessibilityRole="button"
                accessibilityLabel={chip.fr}
                accessibilityHint="Affiche une explication simple"
                accessibilityState={{ selected: active }}
                onPress={() => setSelected(active ? null : chip.code)}
                style={[styles.chip, { backgroundColor: active ? colors.primary : colors.primarySoft }]}>
                <AppText variant="caption" color={active ? colors.onPrimary : colors.primaryStrong}>
                  {chip.fr}
                  {chip.ar ? ` · ${chip.ar}` : ""}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {selectedChip ? (
        <View style={[styles.definition, { backgroundColor: colors.surfaceMuted }]}>
          <AppText variant="caption">{definition ?? `${selectedChip.fr} : pas d'explication détaillée pour cette étiquette.`}</AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tajweedRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  tajweedDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
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
  chip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.pill, minHeight: 32, justifyContent: "center" },
  definition: { padding: spacing.md, borderRadius: radius.md },
  glossary: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, gap: spacing.sm },
  glossaryHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 36 },
  link: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  occurrences: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  occurrence: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.sm, paddingHorizontal: spacing.sm, alignItems: "center" },
});
