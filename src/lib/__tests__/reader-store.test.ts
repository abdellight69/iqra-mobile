/* eslint-disable import/first -- les mocks Jest doivent précéder les imports */
jest.mock("expo-secure-store", () => ({ getItemAsync: jest.fn(async () => null), setItemAsync: jest.fn(async () => undefined) }));

import { ARABIC_SIZES, sanitizeReaderSettings } from "../reader-store";

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
