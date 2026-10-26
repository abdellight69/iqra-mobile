import { useEventListener } from "expo";
import { useAudioPlayer, useAudioPlayerStatus, type AudioMetadata } from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { create } from "zustand";
import type { VerseAudioFile, WordTiming } from "./types";

/**
 * Piste d'un verset. Pour une voix publiée en piste par sourate, `url` est la sourate entière et
 * le verset se joue de `startMs` à `endMs` (minutage des mots compté depuis le début de la piste).
 */
export type Track = { key: string; url: string; words?: WordTiming[]; startMs?: number; endMs?: number };

/** Piste d'un verset telle que la renvoie l'API audio d'une sourate. */
export function verseTrack(file: VerseAudioFile): Track {
  return {
    key: file.verseKey,
    url: file.url,
    words: file.words,
    ...(file.endMs !== undefined ? { startMs: file.startMs ?? 0, endMs: file.endMs } : {}),
  };
}

/** Le verset joué dans une piste par sourate est-il terminé ? */
export function rangeEnded(track: Pick<Track, "endMs"> | undefined, timeMs: number): boolean {
  return track?.endMs !== undefined && timeMs >= track.endMs;
}

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

/** Vitesses de récitation proposées (la hauteur de la voix ne change pas). */
export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25] as const;

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
  // Piste par sourate : fichier chargé (pour passer d'un verset à l'autre sans le recharger), début
  // à atteindre dès le chargement, et fin du verset surveillée seulement après un état de lecture
  // antérieur à cette fin (un état reçu juste avant le saut ne doit pas relancer « fin du verset »).
  const loadedUrl = useRef<string | null>(null);
  const pendingStart = useRef<number | null>(null);
  const rangeArmed = useRef(false);

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

  /** Joue la piste depuis son début (début du verset dans la piste de la sourate, le cas échéant). */
  const startTrack = useCallback(
    (track: Track) => {
      rangeArmed.current = false;
      const start = (track.startMs ?? 0) / 1000;
      if (loadedUrl.current === track.url && player.isLoaded) {
        void player.seekTo(start).then(() => player.play());
        return;
      }
      loadedUrl.current = track.url;
      player.replace({ uri: track.url });
      player.setPlaybackRate(rate, "high");
      if (start > 0) pendingStart.current = start;
      else {
        pendingStart.current = null;
        player.play();
      }
    },
    [player, rate],
  );

  const playAt = useCallback(
    (i: number, nextRound = 1) => {
      const track = tracks[i];
      if (!track) return;
      claimPlayback(owner, stop);
      startTrack(track);
      showOnLockScreen(track);
      setIndex(i);
      setPlays(1);
      setRound(nextRound);
    },
    [tracks, startTrack, showOnLockScreen, owner, stop],
  );

  // Vitesse modifiée pendant la lecture.
  const loaded = status.isLoaded;
  useEffect(() => {
    if (loaded) player.setPlaybackRate(rate, "high");
  }, [player, rate, loaded]);

  // Écran démonté : le lecteur est libéré par expo-audio ; on ne doit plus être « le son en cours ».
  useEffect(() => () => releasePlayback(owner), [owner]);

  // Fin d'une piste (ou du verset dans la piste de la sourate) : on la rejoue, on passe à la
  // suivante, on reprend le passage ou on s'arrête.
  useEventListener(player, "playbackStatusUpdate", (update) => {
    if (pendingStart.current !== null && update.isLoaded) {
      const start = pendingStart.current;
      pendingStart.current = null;
      void player.seekTo(start).then(() => player.play());
      return;
    }
    if (index === null) return;
    const track = tracks[index];
    const timeMs = update.currentTime * 1000;
    if (track?.endMs !== undefined && update.playing && !rangeEnded(track, timeMs)) rangeArmed.current = true;
    const verseEnded = rangeArmed.current && update.playing && rangeEnded(track, timeMs);
    if (!update.didJustFinish && !verseEnded) return;
    rangeArmed.current = false;
    if (plays < repeat) {
      setPlays(plays + 1);
      if (track) startTrack(track);
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

/**
 * Lecteur ponctuel (prononciation d'un mot, verset seul) : interrompt le son en cours, et s'efface
 * devant le suivant. Avec `range`, ne joue que ce passage de la piste (verset d'une piste par sourate).
 */
export function useOneShot() {
  const player = useAudioPlayer(null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const [owner] = useState(() => Symbol("one-shot"));
  const pendingStart = useRef<number | null>(null);
  const endMs = useRef<number | null>(null);
  useEffect(() => () => releasePlayback(owner), [owner]);
  useEventListener(player, "playbackStatusUpdate", (update) => {
    if (pendingStart.current !== null && update.isLoaded) {
      const start = pendingStart.current;
      pendingStart.current = null;
      void player.seekTo(start).then(() => player.play());
    } else if (endMs.current !== null && update.playing && update.currentTime * 1000 >= endMs.current) {
      endMs.current = null;
      player.pause();
    }
  });
  const play = useCallback(
    (url: string, range?: { startMs?: number; endMs?: number }) => {
      claimPlayback(owner, () => {
        try {
          player.pause();
        } catch {
          // Lecteur déjà libéré.
        }
      });
      endMs.current = range?.endMs ?? null;
      const start = (range?.startMs ?? 0) / 1000;
      pendingStart.current = start > 0 ? start : null;
      player.replace({ uri: url });
      if (start <= 0) player.play();
    },
    [player, owner],
  );
  return { playing: status.playing, play };
}
