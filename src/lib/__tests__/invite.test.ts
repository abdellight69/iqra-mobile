import { inviteFriendMessage } from "../invite";

describe("inviter un ami", () => {
  it("écrit une phrase avec l'adresse du site", () => {
    expect(inviteFriendMessage("https://eqra.fr")).toBe("Je lis et j’apprends le Coran avec Eqra, une application gratuite en français. Rejoins-moi : https://eqra.fr");
  });

  it("utilise le site configuré par défaut", () => {
    expect(inviteFriendMessage()).toMatch(/^Je lis .* : https:\/\/\S+$/);
  });
});
