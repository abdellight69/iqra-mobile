/* eslint-disable import/first -- les mocks Jest doivent précéder les imports */
jest.mock("expo/fetch", () => ({ fetch: jest.fn() }));
jest.mock("../session-storage", () => ({ loadTokens: jest.fn(async () => null), saveTokens: jest.fn(async () => undefined) }));

import type { PurchasesPackage, PurchasesStoreProduct } from "react-native-purchases";
import { isCancelled, purchasesEnabled, supportOffers } from "../purchases";

const pkg = (packageType: string, priceString: string) => ({ packageType, product: { priceString } }) as unknown as PurchasesPackage;
const tip = { priceString: "4,99 €" } as PurchasesStoreProduct;

describe("abonnement Soutien : offres", () => {
  it("mensuel, annuel puis le merci unique, quel que soit l'ordre du store", () => {
    const offers = supportOffers([pkg("ANNUAL", "24,99 €"), pkg("MONTHLY", "2,99 €"), pkg("LIFETIME", "99 €")], tip);
    expect(offers.map((o) => [o.id, o.price])).toEqual([
      ["monthly", "2,99 €"],
      ["annual", "24,99 €"],
      ["tip", "4,99 €"],
    ]);
    expect(offers[0]!.package).toBeDefined();
    expect(offers[2]!.product).toBe(tip);
  });

  it("n'affiche que ce que le store propose", () => {
    expect(supportOffers([pkg("MONTHLY", "2,99 €")], null).map((o) => o.id)).toEqual(["monthly"]);
    expect(supportOffers([], null)).toEqual([]);
  });

  it("une feuille de paiement fermée n'est pas une erreur", () => {
    expect(isCancelled({ userCancelled: true, code: "1" })).toBe(true);
    expect(isCancelled({ userCancelled: false })).toBe(false);
    expect(isCancelled(new Error("réseau"))).toBe(false);
    expect(isCancelled(null)).toBe(false);
  });

  it("sans clé RevenueCat, l'abonnement est absent de l'app", () => {
    expect(purchasesEnabled).toBe(false);
  });
});
