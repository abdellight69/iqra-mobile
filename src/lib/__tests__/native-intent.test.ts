/**
 * Liens universels (https://eqra.fr/…) traduits en routes de l'app par `+native-intent.ts`,
 * et lien d'invitation https gardé hors connexion par `pending-invite.ts`.
 */
import { redirectSystemPath } from "../../app/+native-intent";
import { rememberInvite, takePendingInvite } from "../pending-invite";
import { isSiteLink, parseQuery, parseUrl, redirectSystemPathTo, routeFromUniversalLink } from "../universal-links";

const TOKEN = "AbCdEfGhIjKlMnOp_-qrStUv";

describe("parseUrl / parseQuery", () => {
  it("découpe une URL absolue sans URL ni URLSearchParams", () => {
    expect(parseUrl("https://eqra.fr/verifier/?token=abc&x=1#frag")).toEqual({
      scheme: "https",
      host: "eqra.fr",
      path: "/verifier/",
      query: { token: "abc", x: "1" },
    });
    expect(parseUrl("eqra://famille/rejoindre?t=abc")).toEqual({ scheme: "eqra", host: "famille", path: "/rejoindre", query: { t: "abc" } });
    expect(parseUrl("HTTPS://EQRA.FR")).toEqual({ scheme: "https", host: "eqra.fr", path: "/", query: {} });
    expect(parseUrl("/surah/1")).toBeNull();
    expect(parseUrl("")).toBeNull();
  });

  it("décode la query et garde la première valeur d'une clé répétée", () => {
    expect(parseQuery("a=1&b=%C3%A9t%C3%A9&c&a=2&=x")).toEqual({ a: "1", b: "été", c: "" });
    expect(parseQuery("bad=%E0%A4%A")).toEqual({ bad: "%E0%A4%A" });
  });
});

describe("routeFromUniversalLink", () => {
  it("ne traduit que les liens du site", () => {
    expect(isSiteLink("https://eqra.fr/s/1")).toBe(true);
    expect(isSiteLink("https://www.eqra.fr/s/1")).toBe(true);
    expect(isSiteLink("eqra://surah/1")).toBe(false);
    expect(isSiteLink("https://example.com/s/1")).toBe(false);
    expect(routeFromUniversalLink("eqra://famille/rejoindre?t=" + TOKEN)).toBeNull();
    expect(routeFromUniversalLink("https://example.com/verifier/?token=" + TOKEN)).toBeNull();
    expect(routeFromUniversalLink("nimporte quoi")).toBeNull();
  });

  it("ouvre l'écran Rejoindre avec le jeton ou le code de l'invitation", () => {
    expect(routeFromUniversalLink(`https://eqra.fr/rejoindre/?t=${TOKEN}`)).toBe(`/famille/rejoindre?t=${TOKEN}`);
    expect(routeFromUniversalLink("https://eqra.fr/rejoindre/?c=k7q2-m9xd")).toBe("/famille/rejoindre?c=K7Q2M9XD");
    expect(routeFromUniversalLink("https://eqra.fr/rejoindre?c=K7Q2M9XD")).toBe("/famille/rejoindre?c=K7Q2M9XD");
    // Lien incomplet : l'écran propose de saisir un code.
    expect(routeFromUniversalLink("https://eqra.fr/rejoindre/")).toBe("/famille/rejoindre");
    expect(routeFromUniversalLink("https://eqra.fr/rejoindre/?t=court")).toBe("/famille/rejoindre");
  });

  it("ouvre la vérification d'e-mail et la réinitialisation avec leur jeton", () => {
    expect(routeFromUniversalLink(`https://eqra.fr/verifier/?token=${TOKEN}`)).toBe(`/verify-email?token=${TOKEN}`);
    expect(routeFromUniversalLink(`https://eqra.fr/reinitialiser/?token=${TOKEN}`)).toBe(`/reset-password?token=${TOKEN}`);
    // Jeton absent ou mal formé : l'écran explique que le lien est incomplet.
    expect(routeFromUniversalLink("https://eqra.fr/verifier/")).toBe("/verify-email");
    expect(routeFromUniversalLink("https://eqra.fr/reinitialiser/?token=<script>")).toBe("/reset-password");
  });

  it("ouvre une sourate, au verset demandé", () => {
    expect(routeFromUniversalLink("https://eqra.fr/s/112")).toBe("/surah/112");
    expect(routeFromUniversalLink("https://eqra.fr/s/112/")).toBe("/surah/112");
    expect(routeFromUniversalLink("https://eqra.fr/s/112/1")).toBe("/surah/112?verse=1");
    expect(routeFromUniversalLink("https://eqra.fr/s/2/286")).toBe("/surah/2?verse=286");
    // Hors bornes : la liste des sourates, ou la sourate sans verset.
    expect(routeFromUniversalLink("https://eqra.fr/s/115")).toBe("/quran");
    expect(routeFromUniversalLink("https://eqra.fr/s/0/1")).toBe("/quran");
    expect(routeFromUniversalLink("https://eqra.fr/s/abc")).toBe("/quran");
    expect(routeFromUniversalLink("https://eqra.fr/s/")).toBe("/quran");
    expect(routeFromUniversalLink("https://eqra.fr/s/112/287")).toBe("/surah/112");
    expect(routeFromUniversalLink("https://eqra.fr/s/112/x")).toBe("/surah/112");
  });

  it("renvoie à l'accueil pour toute autre page du site", () => {
    expect(routeFromUniversalLink("https://eqra.fr/")).toBe("/");
    expect(routeFromUniversalLink("https://eqra.fr/confidentialite/")).toBe("/");
    expect(routeFromUniversalLink("https://eqra.fr/?utm=x")).toBe("/");
  });
});

describe("redirectSystemPath", () => {
  it("traduit un lien du site et laisse passer un lien eqra://", () => {
    expect(redirectSystemPath({ path: "https://eqra.fr/s/112/1", initial: true })).toBe("/surah/112?verse=1");
    expect(redirectSystemPath({ path: `eqra://reset-password?token=${TOKEN}`, initial: false })).toBe(`eqra://reset-password?token=${TOKEN}`);
    expect(redirectSystemPathTo("eqra://")).toBe("eqra://");
  });
});

describe("rememberInvite : lien d'invitation ouvert hors connexion", () => {
  it("garde le jeton d'un lien https du site comme celui d'un lien eqra://", () => {
    rememberInvite(`https://eqra.fr/rejoindre/?t=${TOKEN}`);
    expect(takePendingInvite()).toEqual({ t: TOKEN });
    expect(takePendingInvite()).toBeNull();
    rememberInvite("eqra://famille/rejoindre?c=K7Q2M9XD");
    expect(takePendingInvite()).toEqual({ c: "K7Q2M9XD" });
    rememberInvite(`https://eqra.fr/verifier/?token=${TOKEN}`);
    expect(takePendingInvite()).toBeNull();
  });
});
