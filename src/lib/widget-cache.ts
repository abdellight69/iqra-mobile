import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import type { WidgetSnapshot } from "./widget";

/**
 * Dernier instantané du widget gardé sur l'appareil, pour redessiner le widget Android quand le
 * système le demande sans que l'app soit ouverte (iOS lit directement le groupe d'applications).
 */
const supported = Platform.OS !== "web";
const cacheFile = () => new File(Paths.document, "widget-snapshot.json");

export function readSnapshotCache(): WidgetSnapshot | null {
  if (!supported) return null;
  try {
    const file = cacheFile();
    return file.exists ? (JSON.parse(file.textSync()) as WidgetSnapshot) : null;
  } catch {
    return null;
  }
}

export function writeSnapshotCache(snapshot: WidgetSnapshot | null): void {
  if (!supported) return;
  try {
    const file = cacheFile();
    if (snapshot) file.write(JSON.stringify(snapshot));
    else if (file.exists) file.delete();
  } catch {
    // Cache facultatif.
  }
}
