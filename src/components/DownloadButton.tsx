import Ionicons from "@expo/vector-icons/Ionicons";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { errorMessage } from "@/lib/api";
import { formatBytes, offlineSupported, useOffline } from "@/lib/offline";
import { useMe } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import { AppText } from "./AppText";

/** Télécharge une sourate (texte, traduction, phonétique, audio) pour la lire sans réseau. */
export function DownloadButton({ chapterId }: { chapterId: number }) {
  const colors = useColors();
  const me = useMe();
  const entry = useOffline((s) => s.entries[chapterId]);
  const progress = useOffline((s) => s.progress[chapterId]);
  const download = useOffline((s) => s.download);
  const remove = useOffline((s) => s.remove);
  if (!offlineSupported) return null;

  const start = () =>
    download(chapterId, me.data?.translationId ?? null, me.data?.recitationId ?? null).catch((error: unknown) =>
      Alert.alert("Téléchargement interrompu", errorMessage(error)),
    );

  const label =
    progress !== undefined
      ? `Téléchargement… ${Math.round(progress * 100)} %`
      : entry
        ? `Disponible hors ligne · ${formatBytes(entry.bytes)}`
        : "Télécharger pour l’écouter hors ligne";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={progress !== undefined}
      onPress={() =>
        entry
          ? Alert.alert("Sourate téléchargée", "Texte, traduction et récitation sont disponibles sans connexion.", [
              { text: "Fermer", style: "cancel" },
              { text: "Mettre à jour", onPress: () => void start() },
              { text: "Supprimer", style: "destructive", onPress: () => remove(chapterId) },
            ])
          : void start()
      }
      style={[styles.button, { backgroundColor: colors.surfaceMuted }]}>
      <Ionicons
        name={progress !== undefined ? "cloud-download" : entry ? "checkmark-circle" : "cloud-download-outline"}
        size={15}
        color={entry ? colors.primary : colors.textMuted}
      />
      <AppText variant="caption" color={entry ? colors.primary : undefined}>
        {label}
      </AppText>
      {progress !== undefined ? (
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: colors.primary }]} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  track: { width: 48, height: 4, borderRadius: radius.pill, overflow: "hidden" },
  fill: { height: "100%" },
});
