import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { isNetworkError } from "./offline";
import { queueMissionStep } from "./outbox";
import type { KidToday, LearnedWord, MissionChild, MissionPlan, MissionPlanDetail, MissionRange, MissionStep, VerseNote } from "./types";

/** Missions parent → enfant (backend : docs/missions-v1.md) : requêtes du profil actif. */
export const missionKeys = {
  all: ["missions"] as const,
  children: ["missions", "children"] as const,
  plan: (id: string) => ["missions", "plan", id] as const,
  notes: (verseKeys: string[]) => ["missions", "notes", verseKeys.join(",")] as const,
};

export type MissionPlanInput = {
  childId: string;
  ranges: MissionRange[];
  versesPerDay: number;
  weekdays: number[];
  steps: MissionStep[];
  title?: string | null;
  messageText?: string | null;
  messageAudioId?: string | null;
  replace?: boolean;
};

export type MissionPlanChanges = Partial<{
  title: string | null;
  messageText: string | null;
  messageAudioId: string | null;
  weekdays: number[];
  steps: MissionStep[];
  status: "active" | "paused";
}>;

export function useMissionChildren(enabled = true) {
  return useQuery({
    queryKey: missionKeys.children,
    queryFn: async () => (await api<{ children: MissionChild[] }>("/me/missions/children")).children,
    enabled,
  });
}

export function useMissionPlan(id: string) {
  return useQuery({
    queryKey: missionKeys.plan(id),
    queryFn: async () => (await api<{ plan: MissionPlanDetail }>(`/me/missions/plans/${id}`)).plan,
    enabled: Boolean(id),
  });
}

export function useCreateMissionPlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: MissionPlanInput) => (await api<{ plan: MissionPlan }>("/me/missions/plans", { method: "POST", body: input })).plan,
    onSuccess: () => client.invalidateQueries({ queryKey: missionKeys.all }),
  });
}

export function useUpdateMissionPlan(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (changes: MissionPlanChanges) => (await api<{ plan: MissionPlan }>(`/me/missions/plans/${id}`, { method: "PATCH", body: changes })).plan,
    onSuccess: () => client.invalidateQueries({ queryKey: missionKeys.all }),
  });
}

export function useArchiveMissionPlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/me/missions/plans/${id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: missionKeys.all }),
  });
}

export function useVerseNotes(verseKeys: string[]) {
  return useQuery({
    queryKey: missionKeys.notes(verseKeys),
    queryFn: async () =>
      (await api<{ notes: Record<string, VerseNote> }>(`/me/missions/notes?verseKeys=${encodeURIComponent(verseKeys.join(","))}`)).notes,
    enabled: verseKeys.length > 0,
  });
}

export function useSaveVerseNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ verseKey, ...note }: { verseKey: string; text: string | null; audioId: string | null; recitationAudioId: string | null }) =>
      (await api<{ note: VerseNote }>(`/me/missions/notes/${verseKey}`, { method: "PUT", body: note })).note,
    onSuccess: () => client.invalidateQueries({ queryKey: ["missions", "notes"] }),
  });
}

export function useDeleteVerseNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (verseKey: string) => api<void>(`/me/missions/notes/${verseKey}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["missions", "notes"] }),
  });
}

// --- Côté enfant ---------------------------------------------------------------

export const kidKeys = {
  today: ["missions", "today"] as const,
  learned: ["vocabulary-learned"] as const,
};

export function useTodayMission(enabled = true) {
  return useQuery({ queryKey: kidKeys.today, queryFn: () => api<KidToday>("/me/missions/today"), enabled });
}

/**
 * Étape réussie : le serveur renvoie la mission du jour à jour (étoiles, mission réussie). Sans
 * réseau, l'étape est gardée sur l'appareil (envoyée à la reconnexion) et comptée tout de suite :
 * l'enfant continue sa mission comme si de rien n'était.
 */
export function useCompleteMissionStep() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { planId: string; dayIndex: number; step: MissionStep }): Promise<KidToday & { queued?: boolean }> => {
      const playedAt = new Date().toISOString();
      try {
        return await api<KidToday>("/me/missions/today/steps", { method: "POST", body: { ...input, playedAt } });
      } catch (error) {
        const current = client.getQueryData<KidToday>(kidKeys.today);
        if (!isNetworkError(error) || !current?.mission) throw error;
        queueMissionStep({ ...input, playedAt });
        return { ...stepDoneLocally(current, input.step), queued: true };
      }
    },
    onSuccess: (today) => {
      client.setQueryData(kidKeys.today, today);
      void client.invalidateQueries({ queryKey: kidKeys.learned });
    },
  });
}

/** La mission du jour telle que le serveur la renverrait une fois l'étape enregistrée. */
export function stepDoneLocally(today: KidToday, step: MissionStep): KidToday {
  const mission = today.mission;
  if (!mission) return today;
  const steps = mission.steps.map((s) => (s.kind === step ? { ...s, done: true } : s));
  const stars = steps.filter((s) => s.done).length;
  const gained = stars - mission.stars;
  return { ...today, totalStars: today.totalStars + gained, mission: { ...mission, steps, stars, completed: steps.every((s) => s.done) } };
}

/** « Le dire à Maman » : la mission du jour réussie est signalée à la famille. */
export function useShareMission() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api<KidToday>("/me/missions/today/share", { method: "POST", body: {} }),
    onSuccess: (today) => client.setQueryData(kidKeys.today, today),
  });
}

export function useLearnedWords(enabled = true) {
  return useQuery({
    queryKey: kidKeys.learned,
    queryFn: async () => (await api<{ words: LearnedWord[] }>("/vocabulary/learned")).words,
    enabled,
  });
}
