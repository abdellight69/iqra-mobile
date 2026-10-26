import { router } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";
import { create } from "zustand";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { IconButton } from "@/components/IconButton";
import { ListGroup, ListRow } from "@/components/List";
import { Screen } from "@/components/Screen";
import { errorMessage } from "@/lib/api";
import { ALL_CHAPTER_IDS, CHAPTER_COUNT, estimateRemainingBytes, formatDownloadSize, FULL_QURAN_SIZE_LABEL } from "@/lib/listening";
import { downloadAll, formatBytes, isDownloadAborted, useOffline, type DownloadAllProgress } from "@/lib/offline";
import { useChapters, useMe } from "@/lib/queries";
import { useReaderSettings } from "@/lib/reader-store";
import { radius, spacing, useColors } from "@/lib/theme";

// Téléchargement de tout le Coran : la série continue si l'on quitte l'écran, et l'on retrouve
// sa progression (et le bouton « Arrêter ») en revenant.
const useBulk = create<{ progress: DownloadAllProgress | null; error: string | null }>(() => ({ progress: null, error: null }));
let bulkController: AbortController | null = null;

export default function Downloads() {
  const colors = useColors();
  const chapters = useChapters();
  const me = useMe();
  const recitationBySurah = useReaderSettings((r) => r.recitationBySurah);
  const entries = useOffline((s) => s.entries);
  const remove = useOffline((s) => s.remove);
  const removeAll = useOffline((s) => s.removeAll);
  const bulk = useBulk((b) => b.progress);
  const bulkError = useBulk((b) => b.error);
  const chapterProgress = useOffline((s) => (bulk ? s.progress[bulk.chapterId] : undefined));
  const list = Object.values(entries).sort((a, b) => a.chapterId - b.chapterId);
  const total = list.reduce((n, e) => n + e.bytes, 0);
  const missing = CHAPTER_COUNT - list.length;
  const estimate = estimateRemainingBytes(list, chapters.data ?? []);
  const estimateLabel = estimate !== null ? `≈ ${formatDownloadSize(estimate)}` : FULL_QURAN_SIZE_LABEL;
  const chapterName = (id: number) => chapters.data?.find((c) => c.id === id)?.nameSimple ?? `Sourate ${id}`;

  const startAll = () => {
    if (bulkController) return;
    const controller = new AbortController();
    bulkController = controller;
    useBulk.setState({ progress: { done: 0, total: CHAPTER_COUNT, chapterId: 1 }, error: null });
    downloadAll({
      chapterIds: ALL_CHAPTER_IDS,
      translationId: me.data?.translationId ?? null,
      recitationFor: (id) => recitationBySurah[id] ?? me.data?.recitationId ?? null,
      signal: controller.signal,
      onProgress: (progress) => useBulk.setState({ progress }),
    })
      .catch((error: unknown) => {
        if (!isDownloadAborted(error)) useBulk.setState({ error: errorMessage(error) });
      })
      .finally(() => {
        bulkController = null;
        useBulk.setState({ progress: null });
      });
  };
  const stopAll = () => bulkController?.abort();
  const confirmRemoveAll = () =>
    Alert.alert("Tout supprimer ?", `Les ${list.length} sourates téléchargées (${formatBytes(total)}) seront effacées de l’appareil.`, [
      { text: "Annuler", style: "cancel" },
      { text: "Tout supprimer", style: "destructive", onPress: removeAll },
    ]);
  const overall = bulk ? Math.min(1, (bulk.done + (chapterProgress ?? 0)) / bulk.total) : 0;

  return (
    <Screen>
      <Card style={styles.card}>
        <AppText variant="headline">Tout le Coran</AppText>
        {bulk ? (
          <>
            <AppText>
              {bulk.done} / {bulk.total} · {chapterName(bulk.chapterId)}
            </AppText>
            <View style={[styles.track, { backgroundColor: colors.border }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(overall * 100) }}>
              <View style={[styles.fill, { width: `${Math.round(overall * 100)}%`, backgroundColor: colors.primary }]} />
            </View>
            <Button title="Arrêter" icon="stop-circle-outline" variant="secondary" size="md" onPress={stopAll} />
          </>
        ) : (
          <>
            <AppText muted>
              {missing === 0
                ? "Les 114 sourates sont sur l’appareil."
                : `${missing} sourate${missing > 1 ? "s" : ""} restante${missing > 1 ? "s" : ""} · ${estimateLabel}`}
            </AppText>
            {missing > 0 ? (
              <>
                <AppText variant="caption" faint>
                  De préférence en Wi-Fi : texte, traduction et récitation de chaque sourate. Vous pouvez arrêter et reprendre plus tard, les sourates déjà présentes sont gardées.
                </AppText>
                <Button title="Tout télécharger" icon="cloud-download-outline" size="md" onPress={startAll} />
              </>
            ) : null}
            {bulkError ? (
              <AppText variant="caption" color={colors.danger}>
                Téléchargement interrompu : {bulkError}
              </AppText>
            ) : null}
          </>
        )}
        {list.length > 0 ? <Button title="Tout supprimer" icon="trash-outline" variant="danger" size="md" disabled={Boolean(bulk)} onPress={confirmRemoveAll} /> : null}
      </Card>

      {list.length === 0 ? (
        <View style={styles.header}>
          <AppText muted>Aucune sourate téléchargée.</AppText>
          <AppText variant="caption" faint>
            Ouvrez une sourate et touchez « Télécharger » pour la lire et l’écouter sans connexion, ou téléchargez tout le Coran ci-dessus.
          </AppText>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <AppText muted>
              {list.length} sourate{list.length > 1 ? "s" : ""} · {formatBytes(total)}
            </AppText>
            <AppText variant="caption" faint>
              Texte, traduction, phonétique et récitation, disponibles sans connexion.
            </AppText>
          </View>
          <ListGroup>
            {list.map((entry) => (
              <ListRow
                key={entry.chapterId}
                icon="checkmark-circle-outline"
                title={`${entry.chapterId}. ${chapterName(entry.chapterId)}`}
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
            ))}
          </ListGroup>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  header: { gap: spacing.xs },
  track: { height: 6, borderRadius: radius.pill, overflow: "hidden" },
  fill: { height: "100%" },
});
