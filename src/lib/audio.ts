import { useEventListener } from "expo";
import { useAudioPlayer, useAudioPlayerStatus, type AudioMetadata } from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { create } from "zustand";
import type { WordTiming } from "./types";

export type Track = { key: string; url: string; words?: WordTiming[] };

// --- Un seul son à la fois --------------------------------------------------------------------
//
// Chaque écran ou composant a son propre lecteur (file de versets, prononciation d'un mot, vocal
// d'un parent). Avant de jouer, il réclame la lecture : celui qui jouait s'arrête. Deux sons ne se
// superposent donc jamais (mot touché pendant la récitation, vocal pendant un verset…).

type PlaybackOwner = { id: symbol; stop: () => void };
let activePlayback: PlaybackOwner | null = null;

/** À appeler juste avant de jouer : arrête le lecteur précédent s'il est différent. */
export function claimPlayback(id: symbol, stop: () => void) {
  if (activePlayback && activePlayback.id !== id) {
    try {
      activePlayback.stop();
    } catch {
      // Lecteur déjà libéré (écran démonté).
    }
  }
  activePlayback = { id, stop };
}

/** À appeler quand un lecteur s'arrête de lui-même ou disparaît. */
export function releasePlayback(id: symbol) {
  if (activePlayback?.id === id) activePlayback = null;
}

/**
 * Verset et mot en cours de récitation, pour tout l'app : les cartes du lecteur de sourate s'y
 * abonnent chacune pour sa clé, au lieu d'être toutes re-rendues à chaque mise à jour du lecteur.
 */
export const useNowPlaying = create<{ currentKey: string | null; currentWord: number | null }>(() => ({ currentKey: null, currentWord: null }));

function publishNowPlaying(currentKey: string | null, currentWord: number | null) {
  const state = useNowPlaying.getState();
  if (state.currentKey !== currentKey || state.currentWord !== currentWord) useNowPlaying.setState({ currentKey, currentWord });
}

/** Mot récité dans ce verset (null si ce verset n'est pas en cours de lecture). */
export function useRecitedWord(verseKey: string): number | null {
  return useNowPlaying((s) => (s.currentKey === verseKey ? s.currentWord : null));
}

/** Ce verset est-il celui en cours de lecture ? */
export function useIsPlayingVerse(verseKey: string): boolean {
  return useNowPlaying((s) => s.currentKey === verseKey);
}

/**
 * Mot en cours de récitation : le dernier mot commencé, tant que l'on n'a pas dépassé sa fin
 * de plus de 300 ms (les courts silences entre deux mots ne font pas clignoter le surlignage).
 */
export function wordAt(words: WordTiming[] | undefined, timeMs: number): number | null {
  const current = words?.filter((w) => w.startMs <= timeMs).at(-1);
  return current && timeMs < current.endMs + 300 ? current.position : null;
}

/** Passage répété : pistes de `start` à `end` (indices inclus), `rounds` fois (Infinity : sans fin). */
export type LoopRange = { start: number; end: number; rounds: number };

export const PLAYBACK_RATES = [0.75, 1, 1.25] as const;

/**
 * Mode audio de l'app : lecture en mode silencieux et en arrière-plan. `doNotMix` (les autres apps
 * se mettent en pause) est exigé par le système pour afficher la lecture sur l'écran verrouillé.
 */
export const PLAYBACK_MODE = {
  playsInSilentMode: true,
  shouldPlayInBackground: true,
  allowsRecording: false,
  interruptionMode: "doNotMix",
} as const;

/**
 * Lecture d'une suite de pistes (versets) avec un seul lecteur : enchaînement automatique,
 * répétition de chaque piste (`repeat`), d'un passage entier (`loop`) et vitesse (`rate`,
 * sans changer la hauteur de la voix). Avec `nowPlaying`, la piste en cours s'affiche sur
 * l'écran verrouillé et dans le centre de contrôle (lecture et pause depuis le système).
 */
export function useTrackQueue(
  tracks: Track[],
  options: {
    repeat?: number;
    autoAdvance?: boolean;
    rate?: number;
    loop?: LoopRange | null;
    nowPlaying?: (track: Track) => AudioMetadata;
    /** Fin naturelle de la dernière piste (enchaînement sans passage répété) : lecture continue, etc. */
    onEnded?: () => void;
  } = {},
) {
  // Mises à jour rapprochées (100 ms) seulement quand une piste a le minutage mot à mot ; sinon 250 ms
  // suffisent (position du lecteur). Session audio gardée active entre deux versets : sinon iOS la coupe
  // à la fin de chaque piste, l'app perd sa place sur l'écran verrouillé (et peut être suspendue avant
  // le verset suivant), la musique d'une autre app reprend.
  const [wordTimed] = useState(() => tracks.some((t) => t.words?.length));
  const player = useAudioPlayer(null, { updateInterval: wordTimed ? 100 : 250, keepAudioSessionActive: true });
  const status = useAudioPlayerStatus(player);
  const [index, setIndex] = useState<number | null>(null);
  const [plays, setPlays] = useState(0);
  const [round, setRound] = useState(1);
  const repeat = Math.max(1, options.repeat ?? 1);
  const autoAdvance = options.autoAdvance ?? true;
  const rate = options.rate ?? 1;
  const loop = options.loop ?? null;
  const nowPlaying = options.nowPlaying;
  // Lu via une référence : l'écouteur de fin de piste voit toujours le dernier rappel fourni.
  const onEnded = useRef(options.onEnded);
  useEffect(() => {
    onEnded.current = options.onEnded;
  });
  const lockScreen = useRef(false);
  const [owner] = useState(() => Symbol("track-queue"));

  const showOnLockScreen = useCallback(
    (track: Track) => {
      if (!nowPlaying) return;
      const metadata = nowPlaying(track);
      try {
        if (lockScreen.current) player.updateLockScreenMetadata(metadata);
        else player.setActiveForLockScreen(true, metadata, { showSeekBackward: false, showSeekForward: false });
        lockScreen.current = true;
      } catch {
        // Affichage système indisponible (navigateur sans Media Session…) : la lecture continue.
      }
    },
    [player, nowPlaying],
  );

  const stop = useCallback(() => {
    try {
      player.pause();
    } catch {
      // Lecteur déjà libéré.
    }
    if (lockScreen.current) {
      lockScreen.current = false;
      try {
        player.clearLockScreenControls();
      } catch {
        // Lecteur déjà libéré.
      }
    }
    releasePlayback(owner);
    setIndex(null);
    setPlays(0);
    setRound(1);
  }, [player, owner]);

  const playAt = useCallback(
    (i: number, nextRound = 1) => {
      const track = tracks[i];
      if (!track) return;
      claimPlayback(owner, stop);
      player.replace({ uri: track.url });
      player.setPlaybackRate(rate, "high");
      player.play();
      showOnLockScreen(track);
      setIndex(i);
      setPlays(1);
      setRound(nextRound);
    },
    [player, tracks, rate, showOnLockScreen, owner, stop],
  );

  // Vitesse modifiée pendant la lecture.
  const loaded = status.isLoaded;
  useEffect(() => {
    if (loaded) player.setPlaybackRate(rate, "high");
  }, [player, rate, loaded]);

  // Écran démonté : le lecteur est libéré par expo-audio ; on ne doit plus être « le son en cours ».
  useEffect(() => () => releasePlayback(owner), [owner]);

  // Fin d'une piste : on la rejoue, on passe à la suivante, on reprend le passage ou on s'arrête.
  useEventListener(player, "playbackStatusUpdate", (update) => {
    if (!update.didJustFinish || index === null) return;
    if (plays < repeat) {
      setPlays(plays + 1);
      void player.seekTo(0).then(() => player.play());
    } else if (loop && index >= loop.end) {
      if (round < loop.rounds) playAt(loop.start, round + 1);
      else stop();
    } else if ((autoAdvance || loop) && index + 1 < tracks.length) {
      playAt(index + 1, round);
    } else {
      stop();
      if (autoAdvance && !loop && index + 1 >= tracks.length) onEnded.current?.();
    }
  });

  const current = index === null ? undefined : tracks[index];
  const currentKey = current?.key ?? null;
  /** Position du mot récité dans le verset en cours, si l'API fournit le minutage. */
  const currentWord = current && status.playing ? wordAt(current.words, status.currentTime * 1000) : null;
  // Partagé avec les cartes de versets (abonnées chacune à leur clé), hors du rendu de l'écran hôte.
  useEffect(() => {
    publishNowPlaying(currentKey, currentWord);
  }, [currentKey, currentWord]);
  useEffect(() => () => publishNowPlaying(null, null), []);

  return {
    currentKey,
    currentWord,
    index,
    plays,
    /** Tour en cours du passage répété. */
    round,
    playing: status.playing,
    // Sans piste chargée, iOS se dit « en chargement » : on ne l'affiche que pendant une lecture.
    buffering: index !== null && status.isBuffering,
    playAt,
    playKey: (key: string) => {
      const i = tracks.findIndex((t) => t.key === key);
      if (i >= 0) playAt(i);
    },
    toggle: () => {
      if (index === null) playAt(loop?.start ?? 0);
      else if (status.playing) player.pause();
      else {
        claimPlayback(owner, stop);
        player.play();
      }
    },
    next: () => {
      if (index !== null && index + 1 < tracks.length) playAt(index + 1, round);
    },
    previous: () => {
      if (index !== null && index > 0) playAt(index - 1, round);
    },
    stop,
  };
}

/** Lecteur ponctuel (prononciation d'un mot) : interrompt le son en cours, et s'efface devant le suivant. */
export function useOneShot() {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [owner] = useState(() => Symbol("one-shot"));
  useEffect(() => () => releasePlayback(owner), [owner]);
  const play = useCallback(
    (url: string) => {
      claimPlayback(owner, () => {
        try {
          player.pause();
        } catch {
          // Lecteur déjà libéré.
        }
      });
      player.replace({ uri: url });
      player.play();
    },
    [player, owner],
  );
  return { playing: status.playing, play };
}
