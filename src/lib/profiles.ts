import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { useAuth } from "./auth-store";
import { consumeDailyReserve } from "./daily-reserve";
import { flushReviews, pendingReviewCount } from "./outbox";
import { rememberProfile } from "./profile-memory";
import { clearQueryCache } from "./query-persistence";
import type { AuthResponse, Profiles } from "./types";
import { clearVoiceNoteCache } from "./voice-note";
import { publishWidgetSnapshot } from "./widget";

/** Couleurs des profils (mêmes identifiants que le serveur), lisibles en clair comme en sombre. */
export const AVATAR_COLORS = {
  green: "#2E8A6C",
  gold: "#B08A3E",
  blue: "#3A6EA5",
  rose: "#C0577A",
  violet: "#7A5BB5",
  orange: "#C8702E",
} as const;
export type Avatar = keyof typeof AVATAR_COLORS;
export const AVATAR_LABELS: Record<Avatar, string> = {
  green: "vert",
  gold: "doré",
  blue: "bleu",
  rose: "rose",
  violet: "violet",
  orange: "orange",
};
export const AVATARS = Object.keys(AVATAR_COLORS) as Avatar[];

export const avatarColor = (avatar: string | null | undefined) =>
  AVATAR_COLORS[(avatar ?? "green") as Avatar] ?? AVATAR_COLORS.green;

const profilesKey = ["profiles"] as const;

export function useProfiles(enabled = true) {
  return useQuery({
    queryKey: profilesKey,
    queryFn: () => api<Profiles>("/me/profiles"),
    enabled,
  });
}

function useInvalidateProfiles() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: profilesKey });
}

export function useCreateProfile() {
  const invalidate = useInvalidateProfiles();
  return useMutation({
    mutationFn: (input: {
      displayName: string;
      avatar: Avatar;
      arabicLevel: "none" | "beginner" | "fluent" | null;
      isChild?: boolean;
    }) => api<{ id: string }>("/me/profiles", { method: "POST", body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateProfile() {
  const invalidate = useInvalidateProfiles();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...changes
    }: {
      id: string;
      displayName?: string;
      avatar?: Avatar;
      isChild?: boolean;
    }) => api<void>(`/me/profiles/${id}`, { method: "PATCH", body: changes }),
    onSuccess: () => {
      void invalidate();
      void client.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useDeleteProfile() {
  const invalidate = useInvalidateProfiles();
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/me/profiles/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useSetPin() {
  const invalidate = useInvalidateProfiles();
  return useMutation({
    mutationFn: (input: { password: string; pin: string | null }) =>
      api<void>("/me/profiles/pin", { method: "PUT", body: input }),
    onSuccess: invalidate,
  });
}

/**
 * Passe sur un autre profil : les révisions faites hors ligne sont d'abord envoyées (sinon elles
 * compteraient pour le nouveau profil), puis la session et toutes les données en cache sont remplacées.
 */
export function useSwitchProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pin }: { id: string; pin?: string }) => {
      await flushReviews();
      if (pendingReviewCount() > 0) {
        throw new Error(
          "Des révisions faites hors ligne n’ont pas encore été envoyées. Reconnectez-vous à Internet, puis changez de profil.",
        );
      }
      // Le serveur révoque la session quittée (refreshToken) en ouvrant la nouvelle ; par sûreté, un
      // serveur plus ancien qui l'ignorerait est couvert par le /auth/logout qui suit.
      const previous = useAuth.getState().tokens?.refreshToken;
      const response = await api<AuthResponse>(`/me/profiles/${id}/switch`, {
        method: "POST",
        body: { ...(pin ? { pin } : {}), ...(previous ? { refreshToken: previous } : {}) },
      });
      if (previous)
        void api("/auth/logout", {
          method: "POST",
          body: { refreshToken: previous },
          auth: false,
        }).catch(() => undefined);
      // Rien du profil quitté ne doit rester : cache des requêtes, séance du jour préparée, vocaux, widget.
      client.clear();
      clearQueryCache();
      consumeDailyReserve();
      clearVoiceNoteCache();
      void publishWidgetSnapshot(null);
      await useAuth.getState().signIn(response);
      await rememberProfile(id);
      return response.user;
    },
  });
}
