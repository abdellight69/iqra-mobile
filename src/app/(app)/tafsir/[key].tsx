import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { ErrorState } from "@/components/States";
import { isFrench, languageLabel } from "@/lib/language";
import { useChapter, useMe, useVerseTafsir } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";

/** Tafsir d'un verset : le commentaire choisi (en français par défaut s'il en existe un). */
export default function TafsirSheet() {
  const colors = useColors();
  const { key } = useLocalSearchParams<{ key: string }>();
  const me = useMe();
  const tafsir = useVerseTafsir(key, me.data?.tafsirId ?? null);
  const [chapterId, verseNumber] = key.split(":").map(Number) as [number, number];
  const chapter = useChapter(chapterId);
  const t = tafsir.data?.tafsir;
  const group = t?.groupFrom && t.groupTo && t.groupFrom !== t.groupTo ? `${t.groupFrom} à ${t.groupTo}` : null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.grabber, { backgroundColor: colors.border }]} />
      <AppText variant="label" color={colors.accent}>
        Tafsir · {chapter.data?.nameSimple ?? `Sourate ${chapterId}`} {verseNumber}
      </AppText>

      {tafsir.isPending ? (
        <ActivityIndicator color={colors.primary} />
      ) : tafsir.isError ? (
        <ErrorState error={tafsir.error} onRetry={() => void tafsir.refetch()} />
      ) : !t ? (
        <View style={[styles.notice, { backgroundColor: colors.surfaceMuted }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">
              {tafsir.data?.frenchAvailable === false ? "Pas de tafsir en français" : "Tafsir indisponible pour ce verset"}
            </AppText>
            <AppText muted>
              {tafsir.data?.frenchAvailable === false
                ? "Aucun tafsir en français n’est disponible pour le moment. Vous pouvez en choisir un dans une autre langue dans les Réglages."
                : "Le commentaire choisi ne couvre pas ce verset."}
            </AppText>
          </View>
        </View>
      ) : (
        <>
          <AppText variant="title">{t.name}</AppText>
          <AppText variant="caption" muted>
            {[t.authorName, t.languageName && !isFrench(t.languageName) ? `en ${languageLabel(t.languageName).toLowerCase()}` : null]
              .filter(Boolean)
              .join(" · ")}
          </AppText>
          {group ? (
            <AppText variant="caption" color={colors.primary}>
              Ce commentaire porte sur les versets {group}.
            </AppText>
          ) : null}
          {t.paragraphs.map((paragraph, i) => (
            <AppText key={i} style={styles.paragraph}>
              {paragraph}
            </AppText>
          ))}
          {t.footnotes ? (
            <View style={[styles.notes, { borderColor: colors.border }]}>
              <AppText variant="label" muted>
                Notes
              </AppText>
              <AppText variant="caption">{t.footnotes}</AppText>
            </View>
          ) : null}
          {t.source ? (
            <>
              <AppText variant="caption" faint>
                Source : {t.source.name} — {t.name}.{" "}
                {t.source.version
                  ? `Version ${t.source.version}.`
                  : `Version non numérotée par ${t.source.name} : texte du ${new Date(t.source.fetchedAt).toLocaleDateString("fr-FR")}.`}{" "}
                Texte reproduit sans modification.
              </AppText>
              <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(t.source!.url)} style={styles.link}>
                <AppText variant="caption" color={colors.primary}>
                  Signaler une erreur à {t.source.name}
                </AppText>
              </Pressable>
            </>
          ) : (
            <AppText variant="caption" faint>
              Source : {t.name}, via Quran.com (Quran Foundation). Texte reproduit sans modification.
            </AppText>
          )}
        </>
      )}

      <Button title="Choisir le tafsir" variant="ghost" icon="options-outline" onPress={() => router.push("/settings")} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 4 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: spacing.sm },
  notice: { flexDirection: "row", gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg },
  paragraph: { fontSize: 16, lineHeight: 26 },
  notes: { gap: 4, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md },
  link: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
});
