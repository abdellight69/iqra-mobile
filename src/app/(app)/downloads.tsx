import { router } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { IconButton } from "@/components/IconButton";
import { ListGroup, ListRow } from "@/components/List";
import { Screen } from "@/components/Screen";
import { EmptyState } from "@/components/States";
import { formatBytes, useOffline } from "@/lib/offline";
import { useChapters } from "@/lib/queries";
import { spacing } from "@/lib/theme";

export default function Downloads() {
  const chapters = useChapters();
  const entries = useOffline((s) => s.entries);
  const remove = useOffline((s) => s.remove);
  const list = Object.values(entries).sort((a, b) => a.chapterId - b.chapterId);
  const total = list.reduce((n, e) => n + e.bytes, 0);

  if (list.length === 0) {
    return (
      <EmptyState
        icon="cloud-download-outline"
        title="Aucune sourate téléchargée"
        message="Ouvrez une sourate et touchez « Télécharger » pour la lire et l’écouter sans connexion."
      />
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText muted>
          {list.length} sourate{list.length > 1 ? "s" : ""} · {formatBytes(total)}
        </AppText>
        <AppText variant="caption" faint>
          Texte, traduction, phonétique et récitation, disponibles sans connexion.
        </AppText>
      </View>
      <ListGroup>
        {list.map((entry) => {
          const chapter = chapters.data?.find((c) => c.id === entry.chapterId);
          return (
            <ListRow
              key={entry.chapterId}
              icon="checkmark-circle-outline"
              title={chapter ? `${chapter.id}. ${chapter.nameSimple}` : `Sourate ${entry.chapterId}`}
              subtitle={`${formatBytes(entry.bytes)} · ${new Date(entry.downloadedAt).toLocaleDateString("fr-FR")}`}
              onPress={() => router.push({ pathname: "/surah/[id]", params: { id: String(entry.chapterId) } })}
              chevron={false}
              right={
                <IconButton
                  icon="trash-outline"
                  label="Supprimer le téléchargement"
                  onPress={() =>
                    Alert.alert("Supprimer le téléchargement ?", undefined, [
                      { text: "Annuler", style: "cancel" },
                      { text: "Supprimer", style: "destructive", onPress: () => remove(entry.chapterId) },
                    ])
                  }
                />
              }
            />
          );
        })}
      </ListGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({ header: { gap: spacing.xs } });
