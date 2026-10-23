import { isDarkPalette, lightColors, palette } from "../palettes";

describe("thème enfant", () => {
  it("remplace le thème choisi par la palette enfant, en clair comme en sombre", () => {
    expect(palette("eqra", false, true).background).toBe("#FBF4E6");
    expect(palette("nuit", false, true)).toBe(palette("eqra", false, true));
    expect(isDarkPalette(palette("eqra", true, true))).toBe(true);
    expect(isDarkPalette(palette("eqra", false, true))).toBe(false);
  });

  it("ne change rien pour un adulte", () => {
    expect(palette("eqra", false)).toBe(lightColors);
    expect(palette("eqra", false, false)).toBe(lightColors);
  });
});
