import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";
import { useOneShot } from "@/lib/audio";
import { openWordSheet } from "@/lib/navigation";
import { useWordContext, useWordExample } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import type { WordContext } from "@/lib/types";
import { transliterate } from "@/lib/transliterate";
import { AppText } from "./AppText";
import { ArabicText } from "./ArabicText";

/**
 * Le mot du lexique dans le Coran : première occurrence trouvée via le Quranic Arabic Corpus,
 * avec la phonétique et l'audio de Quran.com. Rien n'est affiché si le rapprochement n'est pas certain.
 */
export function QuranExample({ wordId, compact = false }: { wordId: string; compact?: boolean }) {
  const colors = useColors();
  const example = useWordExample(wordId);
  // Carte complète : l'occurrence, sinon une mini-phrase de repli, et la famille déjà connue.
  const context = useWordContext(wordId, !compact);
  const audio = useOneShot();
  const data = compact ? example.data : (context.data?.example ?? example.data);
  if (!data) {
    if (compact || !context.data) return null;
    return (
      <>
        {context.data.phrase ? <Phrase phrase={context.data.phrase} /> : null}
        <Family family={context.data.family} />
      </>
    );
  }
  const { word, verseKey } = data;
  // Phonétique de Quran.com, sinon la nôtre : le mot n'est jamais montré en arabe seul.
  const phonetic = word.transliteration ?? transliterate(word.textUthmani);

  if (compact) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Dans le Coran, verset ${verseKey} : ${word.textUthmani}, ${phonetic}${word.translation ? `, ${word.translation}` : ""}. Écouter`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={() => (word.audioUrl ? audio.play(word.audioUrl) : openWordSheet(word))}
        onLongPress={() => openWordSheet(word)}
        style={({ pressed }) => [styles.compact, { opacity: pressed ? 0.6 : 1 }]}>
        <Ionicons name={audio.playing ? "volume-high" : "volume-medium-outline"} size={15} color={colors.accent} />
        <View style={styles.compactText}>
          <View style={styles.compactLine}>
            <ArabicText size={18} style={styles.compactArabic}>
              {word.textUthmani}
            </ArabicText>
            <AppText variant="caption" italic color={colors.accent} numberOfLines={1} style={styles.shrink}>
              {phonetic}
            </AppText>
          </View>
          <AppText variant="caption" muted numberOfLines={1}>
            {word.translation ? `${word.translation} · ` : ""}
            <AppText variant="caption" faint>
              {verseKey}
            </AppText>
          </AppText>
        </View>
      </Pressable>
    );
  }

  return (
    <>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Dans le Coran, verset ${verseKey} : ${word.textUthmani}, ${phonetic}${word.translation ? `, ${word.translation}` : ""}`}
      accessibilityHint="Ouvre l'analyse du mot"
      onPress={() => openWordSheet(word)}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.7 : 1 }]}>
      {word.audioUrl ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Écouter le mot"
          hitSlop={8}
          onPress={() => audio.play(word.audioUrl!)}
          style={[styles.play, { backgroundColor: colors.primary }]}>
          <Ionicons name={audio.playing ? "volume-high" : "play"} size={18} color={colors.onPrimary} />
        </Pressable>
      ) : null}
      <View style={styles.flex}>
        <AppText variant="label" muted>
          Dans le Coran · {verseKey}
        </AppText>
        <AppText italic color={colors.accent} style={styles.translit}>
          {phonetic}
        </AppText>
        <AppText variant="caption" muted numberOfLines={2}>
          {word.translation ?? "Traduction indisponible"}
        </AppText>
      </View>
      <ArabicText size={28}>{word.textUthmani}</ArabicText>
    </Pressable>
    {context.data ? <Family family={context.data.family} /> : null}
    </>
  );
}

/** Mini-phrase : quelques mots du verset autour du mot, chacun avec sa phonétique et son sens. */
function Phrase({ phrase }: { phrase: NonNullable<WordContext["phrase"]> }) {
  const colors = useColors();
  return (
    <View style={[styles.card, styles.phrase, { backgroundColor: colors.surfaceMuted }]}>
      <AppText variant="label" muted>
        Dans le Coran · {phrase.verseKey}
      </AppText>
      <View style={styles.phraseWords}>
        {phrase.words.map((w) => {
          const target = w.position === phrase.position;
          return (
            <Pressable key={w.location} accessibilityRole="button" accessibilityLabel={`${w.textUthmani}, ${w.transliteration ?? transliterate(w.textUthmani)}`} onPress={() => openWordSheet(w)} style={styles.phraseWord}>
              <ArabicText size={target ? 26 : 22} center color={target ? colors.accent : undefined}>
                {w.textUthmani}
              </ArabicText>
              <AppText variant="caption" italic color={colors.accent} center numberOfLines={1}>
                {w.transliteration ?? transliterate(w.textUthmani)}
              </AppText>
              {w.translation ? (
                <AppText variant="caption" muted center numberOfLines={2}>
                  {w.translation}
                </AppText>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Mots du livre de même racine déjà appris : une prise pour la mémoire. */
function Family({ family }: { family: WordContext["family"] }) {
  const colors = useColors();
  if (family.known.length === 0) return null;
  return (
    <View style={[styles.card, styles.family, { backgroundColor: colors.accentSoft }]}>
      <Ionicons name="git-branch-outline" size={16} color={colors.accent} />
      <View style={styles.flex}>
        <AppText variant="label" muted>
          Même famille{family.root ? ` · racine ${[...family.root].join(" ")}` : ""}
        </AppText>
        <AppText variant="caption">
          {family.known.map((k) => `${k.headword} (${transliterate(k.headword)}) : ${k.fr}`).join(" · ")}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg },
  play: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  translit: { fontSize: 18, lineHeight: 24 },
  phrase: { flexDirection: "column", alignItems: "stretch", gap: spacing.sm },
  phraseWords: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" },
  phraseWord: { alignItems: "center", gap: 2, minWidth: 56, maxWidth: 110 },
  family: { alignItems: "flex-start" },
  compact: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "stretch" },
  compactText: { flex: 1 },
  compactLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  compactArabic: { lineHeight: 28 },
  shrink: { flexShrink: 1 },
});
