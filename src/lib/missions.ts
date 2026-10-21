import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { MissionChild, MissionPlan, MissionPlanDetail, MissionRange, MissionStep, VerseNote } from "./types";

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
    mutationFn: async ({ verseKey, ...note }: { verseKey: string; text: string | null; audioId: string | null }) =>
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
