import Ionicons from "@expo/vector-icons/Ionicons";
import * as Sharing from "expo-sharing";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ViewShot, { type ViewShotRef } from "react-native-view-shot";
import { AppText } from "@/components/AppText";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/Button";
import { ErrorState, LoadingState } from "@/components/States";
import { verseTransliteration } from "@/lib/quran-text";
import { useChapter, useMe, useOfflineChapter, useVerse } from "@/lib/queries";
import { fonts, radius, spacing, useColors } from "@/lib/theme";

/** Styles de la carte : fond, texte arabe, texte secondaire, ornement. */
const THEMES = {
  emeraude: { label: "Émeraude", background: "#0F4F44", arabic: "#F7F5F0", text: "#FFFFFFD9", muted: "#FFFFFF8C", accent: "#D9B56A" },
  sable: { label: "Sable", background: "#F3ECDC", arabic: "#1B1B18", text: "#3F3E39", muted: "#7A776E", accent: "#B08A3E" },
  nuit: { label: "Nuit", background: "#111614", arabic: "#EDE7DA", text: "#EDE7DACC", muted: "#EDE7DA80", accent: "#C9A45C" },
} as const;
type ThemeName = keyof typeof THEMES;

/** Taille du texte arabe selon la longueur du verset, pour garder une carte lisible. */
function arabicSize(text: string): number {
  if (text.length < 60) return 34;
  if (text.length < 160) return 28;
  if (text.length < 320) return 23;
  return 19;
}

function translationSize(text: string) {
  return text.length < 220 ? { fontSize: 16, lineHeight: 25 } : { fontSize: 14, lineHeight: 21 };
}

export default function ShareVerse() {
  const colors = useColors();
  const { key } = useLocalSearchParams<{ key: string }>();
  const [chapterId] = key.split(":").map(Number) as [number, number];
  const me = useMe();
  const verse = useVerse(key, me.data?.translationId ?? null);
  const offline = useOfflineChapter(chapterId);
  const chapter = useChapter(chapterId);
  const card = useRef<ViewShotRef>(null);
  const [theme, setTheme] = useState<ThemeName>("emeraude");
  const [showTranslation, setShowTranslation] = useState(true);
  const [showTransliteration, setShowTransliteration] = useState(false);
  const [sharing, setSharing] = useState(false);

  const data = verse.data ?? (verse.isError ? offline.data?.verses.find((v) => v.key === key) : undefined);
  if (!data && verse.isError) return <ErrorState error={verse.error} onRetry={() => void verse.refetch()} />;
  if (!data) return <LoadingState />;

  const t = THEMES[theme];
  const transliteration = showTransliteration ? verseTransliteration(data) : null;
  const reference = `${chapter.data?.nameSimple ?? `Sourate ${chapterId}`} · ${key}`;

  async function share() {
    if (!card.current) return;
    setSharing(true);
    try {
      const uri = await card.current.capture();
      await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png", dialogTitle: "Partager le verset" });
    } catch {
      Alert.alert("Partage impossible", "L’image du verset n’a pas pu être créée.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={colors.textMuted} />
        </Pressable>
        <AppText variant="headline">Partager le verset</AppText>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* La carte capturée en image. */}
        <ViewShot ref={card} options={{ format: "png", quality: 1, result: "tmpfile" }} style={[styles.card, { backgroundColor: t.background }]}>
          <BrandMark size={34} color={t.accent} />
          <AppText
            style={{
              fontFamily: fonts.arabic,
              fontSize: arabicSize(data.textUthmani),
              lineHeight: Math.round(arabicSize(data.textUthmani) * 1.9),
              color: t.arabic,
              textAlign: "center",
              writingDirection: "rtl",
            }}>
            {data.textUthmani}
          </AppText>
          {transliteration ? (
            <AppText italic center style={[styles.transliteration, { color: t.accent }]}>
              {transliteration}
            </AppText>
          ) : null}
          {showTranslation && data.translation ? (
            <AppText center style={[translationSize(data.translation.text), { color: t.text }]}>
              {`«\u00A0${data.translation.text}\u00A0»`}
            </AppText>
          ) : null}
          <View style={[styles.rule, { backgroundColor: t.accent }]} />
          <AppText center style={[styles.reference, { color: t.arabic }]}>
            {reference}
          </AppText>
          {showTranslation && data.translation?.resourceName ? (
            <AppText variant="caption" center style={{ color: t.muted }}>
              Traduction : {data.translation.resourceName}
            </AppText>
          ) : null}
          <AppText variant="label" center style={[styles.brand, { color: t.muted }]}>
            Iqra
          </AppText>
        </ViewShot>

        <View style={styles.themes}>
          {(Object.keys(THEMES) as ThemeName[]).map((name) => (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityState={{ selected: theme === name }}
              onPress={() => setTheme(name)}
              style={[styles.theme, { borderColor: theme === name ? colors.primary : colors.border }]}>
              <View style={[styles.swatch, { backgroundColor: THEMES[name].background, borderColor: THEMES[name].accent }]} />
              <AppText variant="caption" color={theme === name ? colors.primary : colors.textMuted}>
                {THEMES[name].label}
              </AppText>
            </Pressable>
          ))}
        </View>

        <View style={[styles.options, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Option label="Traduction" value={showTranslation} onChange={setShowTranslation} disabled={!data.translation} />
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <Option label="Phonétique" value={showTransliteration} onChange={setShowTransliteration} disabled={!verseTransliteration(data)} />
        </View>
      </ScrollView>

      <View style={styles.cta}>
        {Platform.OS === "web" ? (
          <AppText variant="caption" muted center>
            Le partage en image est disponible sur iPhone et Android.
          </AppText>
        ) : (
          <Button title="Partager l’image" icon="share-outline" loading={sharing} onPress={() => void share()} />
        )}
      </View>
    </SafeAreaView>
  );
}

function Option({ label, value, onChange, disabled }: { label: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.option}>
      <AppText style={styles.flex} muted={disabled}>
        {label}
      </AppText>
      <Switch
        accessibilityLabel={label}
        value={value && !disabled}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.border }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  spacer: { width: 28 },
  content: { padding: spacing.lg, gap: spacing.lg },
  card: { borderRadius: radius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl, alignItems: "center", gap: spacing.lg },
  transliteration: { fontSize: 15, lineHeight: 22 },
  rule: { width: 36, height: 1.5, borderRadius: 1 },
  reference: { fontFamily: fonts.serif, fontSize: 17 },
  brand: { marginTop: spacing.xs, letterSpacing: 3 },
  themes: { flexDirection: "row", gap: spacing.sm },
  theme: { flex: 1, alignItems: "center", gap: 6, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2 },
  options: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.lg },
  option: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm },
  separator: { height: StyleSheet.hairlineWidth },
  cta: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
});
