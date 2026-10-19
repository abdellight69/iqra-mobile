import { useEventListener } from "expo";
import { useAudioPlayer, useAudioPlayerStatus, type AudioMetadata } from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import type { WordTiming } from "./types";

export type Track = { key: string; url: string; words?: WordTiming[] };

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
  } = {},
) {
  // Mises à jour rapprochées pour suivre la récitation mot par mot.
  const player = useAudioPlayer(null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const [index, setIndex] = useState<number | null>(null);
  const [plays, setPlays] = useState(0);
  const [round, setRound] = useState(1);
  const repeat = Math.max(1, options.repeat ?? 1);
  const autoAdvance = options.autoAdvance ?? true;
  const rate = options.rate ?? 1;
  const loop = options.loop ?? null;
  const nowPlaying = options.nowPlaying;
  const lockScreen = useRef(false);

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

  const playAt = useCallback(
    (i: number, nextRound = 1) => {
      const track = tracks[i];
      if (!track) return;
      player.replace({ uri: track.url });
      player.setPlaybackRate(rate, "high");
      player.play();
      showOnLockScreen(track);
      setIndex(i);
      setPlays(1);
      setRound(nextRound);
    },
    [player, tracks, rate, showOnLockScreen],
  );

  // Vitesse modifiée pendant la lecture.
  const loaded = status.isLoaded;
  useEffect(() => {
    if (loaded) player.setPlaybackRate(rate, "high");
  }, [player, rate, loaded]);

  const stop = useCallback(() => {
    player.pause();
    if (lockScreen.current) {
      lockScreen.current = false;
      try {
        player.clearLockScreenControls();
      } catch {
        // Lecteur déjà libéré.
      }
    }
    setIndex(null);
    setPlays(0);
    setRound(1);
  }, [player]);

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
    }
  });

  const current = index === null ? undefined : tracks[index];
  return {
    currentKey: current?.key ?? null,
    /** Position du mot récité dans le verset en cours, si l'API fournit le minutage. */
    currentWord: current && status.playing ? wordAt(current.words, status.currentTime * 1000) : null,
    index,
    plays,
    /** Tour en cours du passage répété. */
    round,
    playing: status.playing,
    buffering: status.isBuffering,
    playAt,
    playKey: (key: string) => {
      const i = tracks.findIndex((t) => t.key === key);
      if (i >= 0) playAt(i);
    },
    toggle: () => {
      if (index === null) playAt(loop?.start ?? 0);
      else if (status.playing) player.pause();
      else player.play();
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

/** Lecteur ponctuel (prononciation d'un mot). */
export function useOneShot() {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  return {
    playing: status.playing,
    play(url: string) {
      player.replace({ uri: url });
      player.play();
    },
  };
}
