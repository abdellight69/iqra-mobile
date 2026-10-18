import { dehydrate, hydrate, type QueryClient } from "@tanstack/react-query";
import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";

/**
 * Copie locale des données du compte (plans, révisions dues, statistiques…) pour ouvrir
 * l'app sans réseau. Les contenus volumineux (versets, audio) passent par les téléchargements.
 */
const PERSISTED = new Set([
  "me",
  "stats",
  "chapters",
  "plans",
  "plan",
  "due-verses",
  "lessons",
  "lesson",
  "comprehension",
  "bookmarks",
  "reading-position",
  "translations",
  "recitations",
  "programs",
  "tafsirs",
  "program",
]);
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const supported = Platform.OS !== "web";
const cacheFile = () => new File(Paths.document, "query-cache.json");

export function restoreQueryCache(client: QueryClient) {
  if (!supported) return;
  try {
    const file = cacheFile();
    if (!file.exists) return;
    const saved = JSON.parse(file.textSync()) as { savedAt: number; state: Parameters<typeof hydrate>[1] };
    if (Date.now() - saved.savedAt < MAX_AGE_MS) hydrate(client, saved.state);
  } catch {
    // Copie illisible : on repart du réseau.
  }
}

/** Enregistre le cache (à quelques secondes d'intervalle) ; renvoie la fonction d'arrêt. */
export function persistQueryCache(client: QueryClient): () => void {
  if (!supported) return () => undefined;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const save = () => {
    timer = null;
    try {
      const state = dehydrate(client, {
        shouldDehydrateQuery: (query) => query.state.status === "success" && PERSISTED.has(String(query.queryKey[0])),
      });
      cacheFile().write(JSON.stringify({ savedAt: Date.now(), state }));
    } catch {
      // Cache facultatif.
    }
  };
  const unsubscribe = client.getQueryCache().subscribe(() => {
    timer ??= setTimeout(save, 2000);
  });
  return () => {
    unsubscribe();
    if (timer) clearTimeout(timer);
  };
}

export function clearQueryCache() {
  if (!supported) return;
  const file = cacheFile();
  if (file.exists) file.delete();
}
