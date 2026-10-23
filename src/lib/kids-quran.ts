import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { transliterate } from "./transliterate";
import type { Word } from "./types";

/** Sourates proposées en premier à un enfant : Al-Fâtiha, puis le Juz' ʿAmma d'An-Nâs à Al-ʿAsr. */
export const KIDS_SURAHS = [1, 114, 113, 112, 111, 110, 109, 108, 107, 106, 105, 104, 103] as const;

/** Phonétique d'un mot pour un enfant : celle de l'app (graphie française), sinon celle de Quran.com. */
export function kidPhonetic(word: Pick<Word, "textUthmani" | "transliteration">): string | null {
  const french = transliterate(word.textUthmani).trim();
  return french && french !== word.textUthmani ? french : word.transliteration;
}

/** Liste des sourates finies relue du stockage : numéros de 1 à 114, sans doublon. */
export function parseFinished(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= 114))];
  } catch {
    return [];
  }
}

const isWeb = Platform.OS === "web";
const storageKey = (profileId: string) => `iqra.kidsFinishedSurahs.${profileId}`;

/**
 * Sourates qu'un enfant a lues jusqu'au bout dans son lecteur, retenues par profil sur l'appareil
 * (SecureStore ; localStorage sur le web) : une étoile sur la tuile de la sourate.
 */
export function useFinishedSurahs(profileId: string | undefined): { finished: Set<number>; markFinished: (chapterId: number) => void } {
  const client = useQueryClient();
  const queryKey = ["kids-finished-surahs", profileId ?? ""];
  // Une requête partagée : la liste se met à jour dès que le lecteur marque une sourate finie.
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        return parseFinished(isWeb ? globalThis.localStorage?.getItem(storageKey(profileId!)) : await SecureStore.getItemAsync(storageKey(profileId!)));
      } catch {
        return [];
      }
    },
    enabled: Boolean(profileId),
    staleTime: Infinity,
  });
  const finished = query.data ?? [];

  const markFinished = (chapterId: number) => {
    if (finished.includes(chapterId)) return;
    const next = [...finished, chapterId];
    client.setQueryData(queryKey, next);
    if (!profileId) return;
    try {
      const raw = JSON.stringify(next);
      if (isWeb) globalThis.localStorage?.setItem(storageKey(profileId), raw);
      else void SecureStore.setItemAsync(storageKey(profileId), raw).catch(() => undefined);
    } catch {
      // Stockage indisponible : l'étoile vaut pour la session en cours.
    }
  };

  return { finished: new Set(finished), markFinished };
}
