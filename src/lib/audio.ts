import { useEventListener } from "expo";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useCallback, useState } from "react";

export type Track = { key: string; url: string };

/**
 * Lecture d'une suite de pistes (versets) avec un seul lecteur :
 * enchaînement automatique, ou répétition d'une même piste pour la mémorisation.
 */
export function useTrackQueue(tracks: Track[], options: { repeat?: number; autoAdvance?: boolean } = {}) {
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [index, setIndex] = useState<number | null>(null);
  const [plays, setPlays] = useState(0);
  const repeat = Math.max(1, options.repeat ?? 1);
  const autoAdvance = options.autoAdvance ?? true;

  const playAt = useCallback(
    (i: number) => {
      const track = tracks[i];
      if (!track) return;
      player.replace({ uri: track.url });
      player.play();
      setIndex(i);
      setPlays(1);
    },
    [player, tracks],
  );

  const stop = useCallback(() => {
    player.pause();
    setIndex(null);
    setPlays(0);
  }, [player]);

  // Fin d'une piste : on la rejoue, on passe à la suivante ou on s'arrête.
  useEventListener(player, "playbackStatusUpdate", (update) => {
    if (!update.didJustFinish || index === null) return;
    if (plays < repeat) {
      setPlays(plays + 1);
      void player.seekTo(0).then(() => player.play());
    } else if (autoAdvance && index + 1 < tracks.length) {
      playAt(index + 1);
    } else {
      setIndex(null);
      setPlays(0);
    }
  });

  return {
    currentKey: index === null ? null : (tracks[index]?.key ?? null),
    index,
    plays,
    playing: status.playing,
    buffering: status.isBuffering,
    playAt,
    playKey: (key: string) => {
      const i = tracks.findIndex((t) => t.key === key);
      if (i >= 0) playAt(i);
    },
    toggle: () => {
      if (index === null) playAt(0);
      else if (status.playing) player.pause();
      else player.play();
    },
    next: () => {
      if (index !== null && index + 1 < tracks.length) playAt(index + 1);
    },
    previous: () => {
      if (index !== null && index > 0) playAt(index - 1);
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
