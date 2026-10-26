/* eslint-disable import/first -- les mocks Jest doivent précéder les imports */
jest.mock("expo", () => ({ useEventListener: jest.fn() }));
jest.mock("expo-audio", () => ({ useAudioPlayer: jest.fn(), useAudioPlayerStatus: jest.fn() }));

import { rangeEnded, verseTrack, wordAt } from "../audio";

// Minutage réel d'Al-Fâtiha 1:1 (Quran.com, al-Afasy) : [début, fin] en ms, 4 mots.
const words = [
  { position: 1, startMs: 60, endMs: 610 },
  { position: 2, startMs: 620, endMs: 1310 },
  { position: 3, startMs: 1320, endMs: 2450 },
  { position: 4, startMs: 2460, endMs: 5970 },
];

describe("wordAt : mot en cours de récitation", () => {
  it("renvoie le mot dont la plage contient l'instant", () => {
    expect(wordAt(words, 100)).toBe(1);
    expect(wordAt(words, 1320)).toBe(3);
    expect(wordAt(words, 5000)).toBe(4);
  });

  it("garde le dernier mot commencé pendant un court silence (≤ 300 ms)", () => {
    expect(wordAt(words, 615)).toBe(1);
    expect(wordAt(words, 1312)).toBe(2);
  });

  it("ne surligne rien avant le premier mot ni longtemps après le dernier", () => {
    expect(wordAt(words, 0)).toBeNull();
    expect(wordAt(words, 5970 + 301)).toBeNull();
  });

  it("ne surligne rien sans minutage", () => {
    expect(wordAt(undefined, 1000)).toBeNull();
    expect(wordAt([], 1000)).toBeNull();
  });
});

// Piste par sourate d'An-Nâs (Quran Foundation, Saad al-Ghamdi) : 114:1 de 5210 à 8900 ms.
const surahFile = {
  verseKey: "114:1",
  url: "https://download.quranicaudio.com/quran/sa3d_al-ghaamidi/complete//114.mp3",
  startMs: 5210,
  endMs: 8900,
  words: [
    { position: 1, startMs: 5410, endMs: 5800 },
    { position: 2, startMs: 5800, endMs: 6620 },
    { position: 3, startMs: 6620, endMs: 7450 },
    { position: 4, startMs: 8270, endMs: 8900 },
  ],
};

describe("verseTrack : piste d'un verset", () => {
  it("garde la plage du verset dans la piste de la sourate", () => {
    expect(verseTrack(surahFile)).toEqual({ key: "114:1", url: surahFile.url, words: surahFile.words, startMs: 5210, endMs: 8900 });
  });
  it("n'ajoute pas de plage à un fichier par verset", () => {
    expect(verseTrack({ verseKey: "1:1", url: "https://verses.quran.com/Alafasy/mp3/001001.mp3", words })).toEqual({
      key: "1:1",
      url: "https://verses.quran.com/Alafasy/mp3/001001.mp3",
      words,
    });
  });
});

describe("rangeEnded : fin du verset dans la piste de la sourate", () => {
  it("s'arrête à la fin du verset, pas avant", () => {
    expect(rangeEnded(verseTrack(surahFile), 8899)).toBe(false);
    expect(rangeEnded(verseTrack(surahFile), 8900)).toBe(true);
  });
  it("laisse un fichier par verset aller jusqu'à sa fin", () => {
    expect(rangeEnded({}, 999_999)).toBe(false);
    expect(rangeEnded(undefined, 999_999)).toBe(false);
  });
  it("surligne les mots avec le temps compté depuis le début de la sourate", () => {
    expect(wordAt(surahFile.words, 6000)).toBe(2);
    expect(wordAt(surahFile.words, 8300)).toBe(4);
  });
});
