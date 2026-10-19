/**
 * Fermeture d'un écran : retour arrière s'il y a un historique, sinon remplacement par l'écran d'origine
 * (cas d'un rechargement du bundle ou d'un lancement par lien profond).
 */
import { router } from "expo-router";
import { closeScreen } from "../navigation";

jest.mock("expo-router", () => ({ router: { canGoBack: jest.fn(), back: jest.fn(), replace: jest.fn(), push: jest.fn() } }));

const mocked = router as jest.Mocked<typeof router>;

describe("closeScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("dépile l'écran quand la pile a un historique", () => {
    mocked.canGoBack.mockReturnValue(true);
    closeScreen("/memorize");
    expect(mocked.back).toHaveBeenCalledTimes(1);
    expect(mocked.replace).not.toHaveBeenCalled();
  });

  it("remplace la route par l'écran d'origine quand la séance est la première route", () => {
    mocked.canGoBack.mockReturnValue(false);
    closeScreen("/memorize");
    expect(mocked.back).not.toHaveBeenCalled();
    expect(mocked.replace).toHaveBeenCalledWith("/memorize");
  });
});
