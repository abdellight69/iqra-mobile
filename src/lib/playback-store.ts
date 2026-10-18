import { create } from "zustand";
import { PLAYBACK_RATES } from "./audio";

/** Vitesse de récitation choisie, partagée par le lecteur et la mémorisation. */
type PlaybackSettings = { rate: number; cycleRate: () => void };

export const usePlayback = create<PlaybackSettings>((set) => ({
  rate: 1,
  cycleRate: () =>
    set((s) => {
      const i = PLAYBACK_RATES.indexOf(s.rate as (typeof PLAYBACK_RATES)[number]);
      return { rate: PLAYBACK_RATES[(i + 1) % PLAYBACK_RATES.length] ?? 1 };
    }),
}));

export function formatRate(rate: number): string {
  return `${String(rate).replace(".", ",")}×`;
}
