import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type {
  EncouragementKind,
  FamilyDetail,
  FamilyInvitation,
  FamilyJoinPreview,
  FamilyMemberStats,
  FamilyReceivedInvitation,
  FamilyRole,
  FamilySharing,
  FamilySummary,
  GoalMetric,
  GoalParticipantStatus,
  GoalPeriod,
  GoalScope,
} from "./types";

/** Familles (backend : docs/familles-v1.md) : toutes les requêtes agissent pour le profil actif. */
export const familyKeys = {
  all: ["families"] as const,
  detail: (id: string) => ["families", id] as const,
  invitations: (id: string) => ["families", id, "invitations"] as const,
  stats: (id: string, userId: string) => ["families", id, "stats", userId] as const,
  received: ["families-invitations-received"] as const,
};

export type JoinCredential = { token: string } | { code: string };
export type GoalInput = { metric: GoalMetric; target: number; period: GoalPeriod; scope: GoalScope; assignees?: string[]; title?: string | null };

export function useFamilies(enabled = true) {
  return useQuery({ queryKey: familyKeys.all, queryFn: () => api<FamilySummary[]>("/families"), enabled });
}

/** Invitations reçues à l'adresse de mon compte. */
export function useReceivedInvitations(enabled = true) {
  return useQuery({ queryKey: familyKeys.received, queryFn: () => api<FamilyReceivedInvitation[]>("/families/invitations/received"), enabled });
}

export function useAcceptInvitation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ invitationId, sharing }: { invitationId: string; sharing: FamilySharing }) =>
      api<{ familyId: string }>(`/families/invitations/${invitationId}/accept`, { method: "POST", body: { sharing } }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: familyKeys.received });
      void client.invalidateQueries({ queryKey: familyKeys.all, exact: true });
    },
  });
}

export function useDeclineInvitation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => api<void>(`/families/invitations/${invitationId}/decline`, { method: "POST" }),
    onSuccess: () => client.invalidateQueries({ queryKey: familyKeys.received }),
  });
}

export function useFamily(id: string) {
  return useQuery({ queryKey: familyKeys.detail(id), queryFn: () => api<FamilyDetail>(`/families/${id}`), enabled: !!id });
}

export function useFamilyInvitations(id: string, enabled: boolean) {
  return useQuery({ queryKey: familyKeys.invitations(id), queryFn: () => api<FamilyInvitation[]>(`/families/${id}/invitations`), enabled });
}

export function useFamilyMemberStats(id: string, userId: string) {
  return useQuery({ queryKey: familyKeys.stats(id, userId), queryFn: () => api<FamilyMemberStats>(`/families/${id}/members/${userId}/stats`) });
}

/** Après une modification : la liste (pastilles) et le détail de la famille se rafraîchissent. */
function useRefresh() {
  const client = useQueryClient();
  return (id?: string) => {
    void client.invalidateQueries({ queryKey: familyKeys.all, exact: !id });
    if (id) void client.invalidateQueries({ queryKey: familyKeys.detail(id) });
  };
}

export function useCreateFamily() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (name: string) => api<{ id: string }>("/families", { method: "POST", body: { name } }),
    onSuccess: () => refresh(),
  });
}

export function useRenameFamily(id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (name: string) => api<void>(`/families/${id}`, { method: "PATCH", body: { name } }),
    onSuccess: () => refresh(id),
  });
}

export function useDeleteFamily(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>(`/families/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      client.removeQueries({ queryKey: familyKeys.detail(id) });
      void client.invalidateQueries({ queryKey: familyKeys.all, exact: true });
    },
  });
}

export function useJoinPreview() {
  return useMutation({ mutationFn: (credential: JoinCredential) => api<FamilyJoinPreview>("/families/join/preview", { method: "POST", body: credential }) });
}

export function useJoinFamily() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ credential, sharing }: { credential: JoinCredential; sharing: FamilySharing }) =>
      api<{ familyId: string }>("/families/join", { method: "POST", body: { ...credential, sharing } }),
    onSuccess: () => refresh(),
  });
}

export function useInvite(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => api<FamilyInvitation>(`/families/${id}/invitations`, { method: "POST", body: { email } }),
    onSuccess: () => client.invalidateQueries({ queryKey: familyKeys.invitations(id) }),
  });
}

export function useRevokeInvitation(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => api<void>(`/families/${id}/invitations/${invitationId}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: familyKeys.invitations(id) }),
  });
}

export function useRegenerateCode(id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: () => api<{ code: string; expiresAt: string }>(`/families/${id}/code`, { method: "POST" }),
    onSuccess: () => refresh(id),
  });
}

export function useRevokeCode(id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: () => api<void>(`/families/${id}/code`, { method: "DELETE" }),
    onSuccess: () => refresh(id),
  });
}

export function useAddProfile(id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ profileId, sharing }: { profileId: string; sharing: FamilySharing }) =>
      api<void>(`/families/${id}/members`, { method: "POST", body: { profileId, sharing } }),
    onSuccess: () => refresh(id),
  });
}

export function useUpdateMember(id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ userId, ...changes }: { userId: string; sharing?: FamilySharing; role?: FamilyRole }) =>
      api<void>(`/families/${id}/members/${userId}`, { method: "PATCH", body: changes }),
    onSuccess: () => refresh(id),
  });
}

/** Quitter (moi ou mon profil) ou retirer un membre (administrateur). */
export function useRemoveMember(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api<void>(`/families/${id}/members/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: familyKeys.all });
    },
  });
}

export function useCreateGoal(id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: GoalInput) => api<{ id: string }>(`/families/${id}/goals`, { method: "POST", body: input }),
    onSuccess: () => refresh(id),
  });
}

export function useArchiveGoal(id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (goalId: string) => api<void>(`/families/${id}/goals/${goalId}`, { method: "DELETE" }),
    onSuccess: () => refresh(id),
  });
}

export function useRespondGoal(id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ goalId, status, userId }: { goalId: string; status: Exclude<GoalParticipantStatus, "pending">; userId?: string }) =>
      api<void>(`/families/${id}/goals/${goalId}/respond`, { method: "POST", body: { status, userId } }),
    onSuccess: () => refresh(id),
  });
}

export function useEncourage(id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: { toUserId: string; kind: EncouragementKind; goalId?: string }) =>
      api<{ id: string }>(`/families/${id}/encouragements`, { method: "POST", body: input }),
    onSuccess: () => refresh(id),
  });
}

export function useMarkEncouragementsSeen(id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: () => api<void>(`/families/${id}/encouragements/seen`, { method: "POST" }),
    onSuccess: () => refresh(id),
  });
}
