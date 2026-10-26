/* eslint-disable import/first -- les mocks Jest doivent précéder les imports */
jest.mock("expo-secure-store", () => ({ getItemAsync: jest.fn(async () => null), setItemAsync: jest.fn(async () => undefined) }));

import { ARABIC_SIZES, sanitizeReaderSettings, sanitizeRecitationBySurah, useReaderSettings } from "../reader-store";

describe("sanitizeReaderSettings : relecture des réglages du lecteur", () => {
  it("garde les réglages valides", () => {
    expect(sanitizeReaderSettings({ showTajweed: true, showTranslation: false, arabicSize: 36 })).toEqual({ showTajweed: true, showTranslation: false, arabicSize: 36 });
  });

  it("ignore les champs inconnus, les types inattendus et les tailles hors liste", () => {
    expect(sanitizeReaderSettings({ showTajweed: "oui", arabicSize: 31, autre: 1 })).toEqual({});
    expect(sanitizeReaderSettings({ arabicSize: ARABIC_SIZES[0] })).toEqual({ arabicSize: ARABIC_SIZES[0] });
  });

  it("tolère un enregistrement absent ou altéré", () => {
    expect(sanitizeReaderSettings(null)).toEqual({});
    expect(sanitizeReaderSettings("n'importe quoi")).toEqual({});
  });
});

describe("sanitizeReaderSettings : lecture continue et récitateur par sourate", () => {
  it("garde la lecture continue et les récitateurs par sourate valides", () => {
    expect(sanitizeReaderSettings({ continuousPlayback: true, recitationBySurah: { 1: 7, "114": 3 } })).toEqual({
      continuousPlayback: true,
      recitationBySurah: { 1: 7, 114: 3 },
    });
  });

  it("ignore une lecture continue d'un autre type et nettoie les récitateurs champ par champ", () => {
    expect(sanitizeReaderSettings({ continuousPlayback: "oui" })).toEqual({});
    expect(sanitizeReaderSettings({ recitationBySurah: { 0: 7, 115: 7, 2: -1, 3: 1.5, 4: "7", 5: 9 } })).toEqual({ recitationBySurah: { 5: 9 } });
    expect(sanitizeReaderSettings({ recitationBySurah: [7] })).toEqual({ recitationBySurah: {} });
  });

  it("ne relit jamais le minuteur de sommeil (réglage de session)", () => {
    expect(sanitizeReaderSettings({ sleepTimerMinutes: 30, sleepEndsAt: 1 })).toEqual({});
  });
});

describe("sanitizeRecitationBySurah", () => {
  it("accepte seulement des sourates 1 à 114 et des entiers positifs", () => {
    expect(sanitizeRecitationBySurah({ 1: 1, 114: 2, abc: 3, 50: 0 })).toEqual({ 1: 1, 114: 2 });
    expect(sanitizeRecitationBySurah(null)).toEqual({});
    expect(sanitizeRecitationBySurah("x")).toEqual({});
  });
});

describe("useReaderSettings : nouveaux réglages d'écoute", () => {
  it("choisit, remplace et retire le récitateur d'une sourate", () => {
    const { setSurahRecitation } = useReaderSettings.getState();
    setSurahRecitation(36, 7);
    setSurahRecitation(2, 4);
    expect(useReaderSettings.getState().recitationBySurah).toEqual({ 36: 7, 2: 4 });
    setSurahRecitation(36, 9);
    setSurahRecitation(2, null);
    expect(useReaderSettings.getState().recitationBySurah).toEqual({ 36: 9 });
  });

  it("fixe l'échéance du minuteur au choix, et la retire pour « aucun » ou une durée hors liste", () => {
    const { setSleepTimerMinutes } = useReaderSettings.getState();
    const before = Date.now();
    setSleepTimerMinutes(15);
    const { sleepTimerMinutes, sleepEndsAt } = useReaderSettings.getState();
    expect(sleepTimerMinutes).toBe(15);
    expect(sleepEndsAt).toBeGreaterThanOrEqual(before + 15 * 60_000);
    setSleepTimerMinutes(0);
    expect(useReaderSettings.getState().sleepEndsAt).toBeNull();
    setSleepTimerMinutes(17);
    expect(useReaderSettings.getState()).toMatchObject({ sleepTimerMinutes: 0, sleepEndsAt: null });
  });

  it("bascule la lecture continue", () => {
    const { toggleContinuousPlayback } = useReaderSettings.getState();
    expect(useReaderSettings.getState().continuousPlayback).toBe(false);
    toggleContinuousPlayback();
    expect(useReaderSettings.getState().continuousPlayback).toBe(true);
  });
});
