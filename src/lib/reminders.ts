import { useQueries } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { router, type Href } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useMemo, useState } from "react";
import { AppState, Platform } from "react-native";
import { create } from "zustand";
import { api } from "./api";
import { useKidsMode } from "./kids";
import { useTodayMission } from "./missions";
import { keys, useDueVerses, usePlans, useStats } from "./queries";
import { planReminders, reminderPath, type PlannedReminder } from "./reminder-plan";
import type { MemorizationPlanDetail } from "./types";

/**
 * Rappels locaux (aucun serveur push) : un rappel quotidien à l'heure choisie tant que l'objectif
 * du jour n'est pas atteint, et un rappel quand des versets deviennent à réviser. Tout est
 * reprogrammé à chaque ouverture de l'app d'après les données en cache.
 */
export type ReminderSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
  /** Rappels aussi quand un profil enfant est ouvert ; c'est le titulaire qui décide. */
  kids: boolean;
};

export const REMINDER_TIMES = [
  { hour: 6, minute: 0 },
  { hour: 8, minute: 0 },
  { hour: 12, minute: 30 },
  { hour: 18, minute: 0 },
  { hour: 20, minute: 0 },
  { hour: 22, minute: 0 },
] as const;

const KEY = "iqra.reminder";
const DEFAULT: ReminderSettings = { enabled: false, hour: 20, minute: 0, kids: false };
const CHANNEL = "reminders";

const isWeb = Platform.OS === "web";

type ReminderStore = ReminderSettings & {
  loaded: boolean;
  load: () => Promise<void>;
  update: (settings: Partial<ReminderSettings>) => Promise<void>;
};

async function permissionGranted(): Promise<boolean> {
  if (isWeb) return false;
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

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
    // Permission retirée depuis les réglages du téléphone : l'interrupteur se désactive.
    const enabled = Boolean(saved.enabled) && (await permissionGranted());
    set({ ...DEFAULT, ...saved, enabled, loaded: true });
  },
  update: async (settings) => {
    const { enabled, hour, minute, kids } = { ...get(), ...settings };
    set({ enabled, hour, minute, kids });
    if (!isWeb) await SecureStore.setItemAsync(KEY, JSON.stringify({ enabled, hour, minute, kids }));
  },
}));

/** Demande l'autorisation d'envoyer des notifications ; renvoie false si elle est refusée. */
export async function requestReminderPermission(): Promise<boolean> {
  if (isWeb) return false;
  if (await permissionGranted()) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export function formatTime(hour: number, minute: number): string {
  return `${hour}h${minute ? String(minute).padStart(2, "0") : ""}`;
}

async function schedule(reminders: PlannedReminder[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (reminders.length === 0 || !(await permissionGranted())) return;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: "Rappels", importance: AndroidImportance.DEFAULT });
  }
  for (const reminder of reminders) {
    await Notifications.scheduleNotificationAsync({
      content: { title: reminder.title, body: reminder.body, data: { url: reminder.url } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.date, channelId: CHANNEL },
    });
  }
}

// Application au premier plan : pas de bannière, l'utilisateur est déjà là.
if (!isWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

/**
 * Échéances de tous les versets suivis (ISO), d'après le détail des plans de mémorisation et la
 * liste des versets déjà dus ; `undefined` tant que rien n'est connu.
 */
export function useDueAts(): string[] | undefined {
  const plans = usePlans();
  const due = useDueVerses();
  const details = useQueries({
    queries: (plans.data ?? []).map((plan) => ({
      queryKey: keys.plan(plan.id),
      queryFn: async () => (await api<{ plan: MemorizationPlanDetail }>(`/memorization/plans/${plan.id}`)).plan,
      staleTime: 5 * 60_000,
    })),
  });
  const detailsKey = details.map((d) => d.dataUpdatedAt).join(",");
  const dueKey = due.data?.map((v) => `${v.key}@${v.dueAt}`).join(",");
  return useMemo(() => {
    if (!plans.data && !due.data) return undefined;
    const byVerse = new Map<string, string>();
    for (const detail of details) {
      for (const verse of detail.data?.verses ?? []) if (verse.dueAt) byVerse.set(verse.key, verse.dueAt);
    }
    // La liste des versets dus fait foi pour ce qui est déjà à réviser.
    for (const verse of due.data ?? []) byVerse.set(verse.key, verse.dueAt);
    return [...byVerse.values()].sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recalcul quand les données changent, pas les objets de requête
  }, [plans.data, detailsKey, dueKey]);
}

/** Se déclenche à chaque retour de l'app au premier plan. */
function useForegroundTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (isWeb) return;
    const subscription = AppState.addEventListener("change", (state) => state === "active" && setTick((t) => t + 1));
    return () => subscription.remove();
  }, []);
  return tick;
}

/**
 * Garde les rappels à jour : réglages, objectif du jour, échéances des versets, et retour au
 * premier plan. Aucun rappel pour un profil enfant tant que le titulaire ne l'a pas permis.
 */
export function useReminderSync() {
  const { enabled, hour, minute, kids: kidsAllowed, loaded, load } = useReminders();
  const kids = useKidsMode();
  const stats = useStats();
  const dueAts = useDueAts();
  // Enfant : le rappel parle de sa mission du jour, et se tait si elle est déjà faite.
  const todayMission = useTodayMission(kids);
  const missionDone = kids ? !todayMission.data?.mission || todayMission.data.mission.completed : false;
  const tick = useForegroundTick();
  const xp = stats.data?.today.xp;
  const goalXp = stats.data?.today.goalXp;
  const dueAtsKey = dueAts?.join(",");

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (isWeb || !loaded) return;
    const active = enabled && (!kids || kidsAllowed);
    if (!active) {
      Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
      return;
    }
    if (kids ? todayMission.data === undefined : xp === undefined || goalXp === undefined) return;
    const reminders = planReminders({
      now: new Date(),
      time: { hour, minute },
      today: { xp: xp ?? 0, goalXp: goalXp ?? 0 },
      dueAts: (dueAts ?? []).map((iso) => new Date(iso)).filter((d) => !Number.isNaN(d.getTime())),
      kid: kids ? { missionDone } : undefined,
    });
    schedule(reminders).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `dueAts` est représenté par `dueAtsKey`
  }, [enabled, hour, minute, kids, kidsAllowed, loaded, xp, goalXp, dueAtsKey, tick, missionDone, todayMission.data === undefined]);
}

/** Toucher une notification ouvre l'écran concerné, à froid comme en arrière-plan. */
function useNativeReminderTaps() {
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const url = response?.notification.request.content.data?.url;
    if (typeof url !== "string") return;
    router.push(reminderPath(url) as Href);
  }, [response]);
}

export const useReminderTaps: () => void = isWeb ? () => undefined : useNativeReminderTaps;
