import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { Platform } from "react-native";
import { create } from "zustand";
import { useStats } from "./queries";

/** Rappel quotidien : envoyé seulement les jours où l'on n'a pas encore pratiqué. */
export type ReminderSettings = { enabled: boolean; hour: number; minute: number };

export const REMINDER_TIMES = [
  { hour: 6, minute: 0 },
  { hour: 8, minute: 0 },
  { hour: 12, minute: 30 },
  { hour: 18, minute: 0 },
  { hour: 20, minute: 0 },
  { hour: 22, minute: 0 },
] as const;

const KEY = "iqra.reminder";
const DEFAULT: ReminderSettings = { enabled: false, hour: 20, minute: 0 };
/** Rappels programmés à l'avance ; ils sont reprogrammés à chaque ouverture de l'app. */
const DAYS_AHEAD = 7;

const isWeb = Platform.OS === "web";

type ReminderStore = ReminderSettings & {
  loaded: boolean;
  load: () => Promise<void>;
  update: (settings: Partial<ReminderSettings>) => Promise<void>;
};

export const useReminders = create<ReminderStore>((set, get) => ({
  ...DEFAULT,
  loaded: false,
  load: async () => {
    const raw = isWeb ? null : await SecureStore.getItemAsync(KEY);
    let saved: Partial<ReminderSettings> = {};
    try {
      saved = raw ? (JSON.parse(raw) as Partial<ReminderSettings>) : {};
    } catch {
      saved = {};
    }
    set({ ...DEFAULT, ...saved, loaded: true });
  },
  update: async (settings) => {
    const { enabled, hour, minute } = { ...get(), ...settings };
    set({ enabled, hour, minute });
    if (!isWeb) await SecureStore.setItemAsync(KEY, JSON.stringify({ enabled, hour, minute }));
  },
}));

/** Demande l'autorisation d'envoyer des notifications ; renvoie false si elle est refusée. */
export async function requestReminderPermission(): Promise<boolean> {
  if (isWeb) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export function formatTime(hour: number, minute: number): string {
  return `${hour}h${minute ? String(minute).padStart(2, "0") : ""}`;
}

async function schedule(settings: ReminderSettings, practicedToday: boolean): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.enabled || !(await Notifications.getPermissionsAsync()).granted) return;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Rappel quotidien",
      importance: AndroidImportance.DEFAULT,
    });
  }
  const now = new Date();
  for (let offset = 0; offset < DAYS_AHEAD; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, settings.hour, settings.minute);
    // Aujourd'hui : pas de rappel si l'heure est passée ou si l'on a déjà pratiqué.
    if (offset === 0 && (practicedToday || date <= now)) continue;
    await Notifications.scheduleNotificationAsync({
      content: { title: "Iqra", body: "Quelques minutes avec le Coran aujourd’hui ? Votre série vous attend." },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: "reminders" },
    });
  }
}

// Application au premier plan : pas de bannière, l'utilisateur est déjà là.
if (!isWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

/** Garde les rappels à jour : réglages, et activité du jour (les statistiques se rafraîchissent après chaque séance). */
export function useReminderSync() {
  const { enabled, hour, minute, loaded, load } = useReminders();
  const stats = useStats();
  const practicedToday = (stats.data?.today.xp ?? 0) > 0;
  const day = stats.data?.today.day;

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (isWeb || !loaded || !day) return;
    schedule({ enabled, hour, minute }, practicedToday).catch(() => undefined);
  }, [enabled, hour, minute, loaded, practicedToday, day]);
}
