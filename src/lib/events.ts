import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { api, ApiError } from "./api";
import { useAuth } from "./auth-store";

/**
 * Mesure d'usage, sur notre propre serveur et rien d'autre : quelques événements sans contenu
 * personnel (l'app s'ouvre, le premier lancement est fini, une séance est faite…), envoyés par
 * lots quand le réseau est là. Ils servent à savoir où les gens s'arrêtent, pas qui ils sont :
 * ni adresse IP, ni identifiant d'appareil, ni texte saisi. Décrit dans la politique de
 * confidentialité ; purgé par le serveur après 180 jours.
 */
export type EventName = "app_open" | "onboarding_done" | "session_done" | "daily_done" | "mission_done" | "plan_viewed";
export type EventProps = Record<string, string | number | boolean>;
export type UsageEvent = { name: EventName; at: string; props?: EventProps };

const supported = Platform.OS !== "web";
const BATCH = 50;
const file = () => new File(Paths.document, "pending-events.json");

function read(): UsageEvent[] {
  if (!supported) return [];
  try {
    const f = file();
    return f.exists ? (JSON.parse(f.textSync()) as UsageEvent[]) : [];
  } catch {
    return [];
  }
}

function write(events: UsageEvent[]) {
  if (!supported) return;
  try {
    const f = file();
    if (events.length === 0) {
      if (f.exists) f.delete();
    } else f.write(JSON.stringify(events.slice(-500)));
  } catch {
    // Mesure facultative : ne jamais gêner l'app.
  }
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing: Promise<void> | null = null;
let lastOpenAt = 0;

/** Enregistre un événement ; il partira avec les suivants dans quelques secondes. */
export function track(name: EventName, props?: EventProps) {
  if (useAuth.getState().status !== "signedIn") return;
  write([...read(), { name, at: new Date().toISOString(), ...(props ? { props } : {}) }]);
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => void flushEvents(), 5_000);
}

/** « L'app s'ouvre » : au plus une fois par demi-heure (démarrage, retour au premier plan). */
export function trackAppOpen() {
  const now = Date.now();
  if (now - lastOpenAt < 30 * 60 * 1000) return;
  lastOpenAt = now;
  track("app_open");
}

/** Envoie ce qui attend, par lots ; une panne réseau garde la file, un refus du serveur la vide. */
export function flushEvents(): Promise<void> {
  flushing ??= (async () => {
    try {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      for (let pending = read(); pending.length > 0 && useAuth.getState().status === "signedIn"; pending = read()) {
        const batch = pending.slice(0, BATCH);
        try {
          await api("/events", { method: "POST", body: { events: batch } });
        } catch (error) {
          // Serveur plus ancien (404) ou lot refusé (4xx) : inutile de le garder ; réseau ou 5xx : on réessaiera.
          const drop = error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 401 && error.status !== 429;
          if (!drop) return;
        }
        // Relu après l'envoi : un événement ajouté pendant la requête n'est pas perdu.
        write(read().slice(batch.length));
      }
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

/** À la déconnexion : ce qui n'est pas parti ne doit pas partir sous un autre compte. */
export function clearEvents() {
  lastOpenAt = 0;
  write([]);
}

/** Pour les tests. */
export const _internal = { read, write };
