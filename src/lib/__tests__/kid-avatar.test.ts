import { avatarLevel, avatarLevelForStars } from "../kid-avatar";

describe("niveau de l'avatar d'un enfant", () => {
  it("monte avec les autocollants : anneau bleu, jaune, doré, étoiles, couronne", () => {
    expect(avatarLevel(0)).toEqual({ level: 1, ring: "blue", stars: 0, crown: false });
    expect(avatarLevel(2)).toEqual({ level: 1, ring: "blue", stars: 0, crown: false });
    expect(avatarLevel(3)).toEqual({ level: 2, ring: "sun", stars: 0, crown: false });
    expect(avatarLevel(5)).toEqual({ level: 2, ring: "sun", stars: 0, crown: false });
    expect(avatarLevel(6)).toEqual({ level: 3, ring: "gold", stars: 3, crown: false });
    expect(avatarLevel(8)).toEqual({ level: 3, ring: "gold", stars: 3, crown: false });
    expect(avatarLevel(9)).toEqual({ level: 4, ring: "gold", stars: 5, crown: false });
    expect(avatarLevel(11)).toEqual({ level: 4, ring: "gold", stars: 5, crown: false });
    expect(avatarLevel(12)).toEqual({ level: 5, ring: "gold", stars: 5, crown: true });
  });

  it("se calcule depuis les étoiles : un autocollant tous les cinq étoiles", () => {
    expect(avatarLevelForStars(0).level).toBe(1);
    expect(avatarLevelForStars(14).level).toBe(1);
    expect(avatarLevelForStars(15).level).toBe(2);
    expect(avatarLevelForStars(30).level).toBe(3);
    expect(avatarLevelForStars(60).level).toBe(5);
    expect(avatarLevelForStars(999).level).toBe(5);
  });
});
