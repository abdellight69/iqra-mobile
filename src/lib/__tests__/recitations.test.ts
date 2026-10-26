import { groupRecitations } from "../recitations";

const afasy = { id: 7, reciterName: "Mishari Rashid al-`Afasy", style: null, translatedName: null, wordByWord: true };
const sudais = { id: 3, reciterName: "Abdur-Rahman as-Sudais", style: null, translatedName: null, wordByWord: false };
const ghamdi = { id: 10013, reciterName: "Saad al-Ghamdi", style: "Murattal", translatedName: "Saad al-Ghamdi", wordByWord: true };

describe("groupRecitations : voix avec ou sans le mot par mot", () => {
  it("sépare les deux groupes en gardant l'ordre de l'API", () => {
    const groups = groupRecitations([sudais, afasy, ghamdi]);
    expect(groups.map((g) => [g.title, g.recitations.map((r) => r.id)])).toEqual([
      ["Mot par mot", [7, 10013]],
      ["Sans le mot par mot", [3]],
    ]);
  });
  it("n'affiche pas de groupe vide", () => {
    expect(groupRecitations([afasy]).map((g) => g.key)).toEqual(["words"]);
    expect(groupRecitations([])).toEqual([]);
  });
  it("range dans le mot par mot une voix sans indication (ancienne réponse du serveur)", () => {
    const { wordByWord: _ignored, ...legacy } = afasy;
    expect(groupRecitations([legacy]).map((g) => g.key)).toEqual(["words"]);
  });
});
