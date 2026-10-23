import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { useWordAudio } from "@/components/kids/KidWordCard";
import { ProgressBar } from "@/components/ProgressBar";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { KID_TONES, KIDS, useKidsColors, wordImage } from "@/lib/kids";
import { useTheme } from "@/lib/queries";
import { spacing, useColors } from "@/lib/theme";

/**
 * Album d'un thème illustré : une case par mot. Un mot appris révèle son image (et s'écoute) ;
 * les autres restent grisées, sous cadenas, jusqu'à ce que l'enfant les trouve en jouant.
 */
export default function Album() {
  const colors = useColors();
  const kc = useKidsColors();
  const { themeId } = useLocalSearchParams<{ themeId: string }>();
  const theme = useTheme(themeId);
  const audio = useWordAudio();

  if (theme.isPending) return <LoadingState />;
  if (theme.isError) return <ErrorState error={theme.error} onRetry={() => void theme.refetch()} />;
  const { theme: info, words: all, learned } = theme.data;
  const words = all.filter((w) => w.imageUrl);
  if (words.length === 0) return <EmptyState icon="images-outline" title="Pas d’album ici" message="Ce thème n’a pas encore d’images." />;
  const known = new Set(learned);
  const found = words.filter((w) => known.has(w.id)).length;
  const complete = found === words.length;
  const violet = kc.tint("violet");

  return (
    <Screen edges={[]} onRefresh={() => void theme.refetch()} refreshing={theme.isRefetching}>
      <Stack.Screen options={{ title: info.title }} />
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: complete ? KIDS.sun : KID_TONES.violet.main, borderBottomColor: complete ? KIDS.sunStroke : KID_TONES.violet.edge }]}>
          <Ionicons name={complete ? "trophy" : "images"} size={32} color={complete ? KIDS.sunInk : KIDS.onHero} />
        </View>
        <AppText variant="display" center>
          {info.title}
        </AppText>
        <AppText variant="bodyStrong" color={complete ? kc.onSunSoft : violet.ink} center>
          {complete ? "Album complet, bravo !" : `${found} image${found > 1 ? "s" : ""} sur ${words.length}`}
        </AppText>
        <ProgressBar value={found / words.length} color={complete ? KIDS.sun : KID_TONES.violet.main} track={colors.border} height={12} />
        {complete ? null : (
          <AppText variant="caption" muted center>
            Joue avec ce thème pour trouver les images qui manquent.
          </AppText>
        )}
      </View>

      <View style={styles.grid}>
        {words.map((word) => {
          const open = known.has(word.id);
          return (
            <Pressable
              key={word.id}
              accessibilityRole="button"
              accessibilityLabel={open ? `${word.fr ?? "Mot"} : écouter` : "Image à trouver"}
              disabled={!open}
              onPress={() => void audio.play(word.id)}
              style={({ pressed }) => [
                styles.tile,
                { backgroundColor: open ? colors.surface : colors.surfaceMuted, borderBottomColor: open ? kc.edge : colors.surfaceMuted, transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}>
              <Image source={wordImage(word)} style={[styles.image, !open && styles.hidden]} contentFit="contain" />
              {open ? (
                <AppText variant="caption" center numberOfLines={1}>
                  {word.fr}
                </AppText>
              ) : (
                <Ionicons name="lock-closed" size={18} color={kc.neutralInk} />
              )}
              {audio.loadingId === word.id ? <ActivityIndicator color={KID_TONES.blue.main} style={styles.loading} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", gap: spacing.sm },
  icon: { width: 76, height: 81, borderRadius: 38, borderBottomWidth: 5, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm + 2 },
  tile: { width: "30%", flexGrow: 1, minHeight: 112, borderRadius: 20, borderBottomWidth: 4, padding: spacing.sm, alignItems: "center", justifyContent: "center", gap: 4 },
  image: { width: 72, height: 72 },
  hidden: { opacity: 0.15 },
  loading: { position: "absolute", top: spacing.sm, right: spacing.sm },
});
