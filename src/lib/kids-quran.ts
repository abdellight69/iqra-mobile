import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { transliterate } from "./transliterate";
import type { Word } from "./types";

/** Vitesses d'écoute d'un enfant : un bouton qui passe de l'une à l'autre. */
export const KID_SPEEDS = [
  { rate: 1, label: "Normal" },
  { rate: 0.75, label: "Lent" },
  { rate: 0.5, label: "Très lent" },
] as const;

/** Vitesse suivante (Normal → Lent → Très lent → Normal). */
export function nextKidSpeed(index: number): number {
  return (index + 1) % KID_SPEEDS.length;
}

/** Sourates proposées en premier à un enfant : Al-Fâtiha, puis le Juz' ʿAmma d'An-Nâs à Al-ʿAsr. */
export const KIDS_SURAHS = [1, 114, 113, 112, 111, 110, 109, 108, 107, 106, 105, 104, 103] as const;

/**
 * Sourates qu'un enfant peut réciter dans sa prière : Al-Fâtiha (dite à chaque unité) et les
 * sourates courtes du Juz' ʿAmma, d'Al-ʿAsr à An-Nâs, lues après elle.
 */
export const PRAYER_SURAHS: readonly number[] = [1, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114];

/** Petit mot pour l'enfant quand la sourate se dit dans la prière ; null sinon. */
export function prayerHint(chapterId: number): string | null {
  if (chapterId === 1) return "Cette sourate, tu la dis à chaque prière !";
  if (PRAYER_SURAHS.includes(chapterId)) return "Cette sourate, tu peux la dire dans ta prière, après Al-Fâtiha.";
  return null;
}

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
