import { Platform } from "react-native";
import type { PurchasesPackage, PurchasesStoreProduct } from "react-native-purchases";
import { API_URL } from "./api";
import { useAuth } from "./auth-store";

/**
 * Abonnement « Soutien » via RevenueCat (docs/soutien-v1.md). Sans clé publique pour la plateforme,
 * la fonction est absente de l'app et le module natif n'est jamais chargé (un dev client plus
 * ancien, sans RevenueCat, continue donc de fonctionner).
 */
const API_KEY =
  Platform.select({ ios: process.env.EXPO_PUBLIC_RC_IOS_KEY, android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY })?.trim() ?? "";
export const purchasesEnabled = API_KEY !== "";

/** Achat unique « Merci » : ne donne pas le badge. */
export const TIP_PRODUCT = "eqra_merci";

/** Pages légales du site (même hôte que l'API, sauf EXPO_PUBLIC_SITE_URL). */
const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? API_URL).replace(/\/+$/, "");
export const TERMS_URL = `${SITE_URL}/conditions/`;
export const PRIVACY_URL = `${SITE_URL}/confidentialite/`;

type Module = typeof import("react-native-purchases");
type Sdk = Module["default"];
let configured = false;
let currentUser: string | null = null;

function sdkModule(): Module {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- chargé seulement si une clé est configurée
  return require("react-native-purchases") as Module;
}

function sdk(): Sdk {
  return sdkModule().default;
}

/** RevenueCat identifié par le titulaire du compte : l'abonnement appartient au compte, pas au profil. */
export async function purchasesFor(ownerId: string): Promise<Sdk> {
  const Purchases = sdk();
  if (!configured) {
    Purchases.configure({ apiKey: API_KEY, appUserID: ownerId });
    configured = true;
  } else if (currentUser !== ownerId) {
    await Purchases.logIn(ownerId);
  }
  currentUser = ownerId;
  return Purchases;
}

// À la déconnexion, RevenueCat oublie le compte (l'appareil peut servir à quelqu'un d'autre).
useAuth.subscribe((state) => {
  if (state.status !== "signedOut" || !configured || currentUser === null) return;
  currentUser = null;
  sdk()
    .logOut()
    .catch(() => undefined);
});

export type SupportOffer = {
  id: "monthly" | "annual" | "tip";
  title: string;
  detail: string;
  price: string;
  package?: PurchasesPackage;
  product?: PurchasesStoreProduct;
};

/** Offres affichées, dans l'ordre : mensuel, annuel, puis le merci unique (chacune seulement si le store la propose). */
export function supportOffers(packages: readonly PurchasesPackage[], tip: PurchasesStoreProduct | null): SupportOffer[] {
  const offers: SupportOffer[] = [];
  const monthly = packages.find((p) => p.packageType === "MONTHLY");
  const annual = packages.find((p) => p.packageType === "ANNUAL");
  if (monthly) {
    offers.push({ id: "monthly", title: "Chaque mois", detail: "Résiliable à tout moment", price: monthly.product.priceString, package: monthly });
  }
  if (annual) {
    offers.push({ id: "annual", title: "Chaque année", detail: "Un seul paiement par an", price: annual.product.priceString, package: annual });
  }
  if (tip) {
    offers.push({ id: "tip", title: "Un merci, une fois", detail: "Sans abonnement ni badge", price: tip.priceString, product: tip });
  }
  return offers;
}

/** L'utilisateur a fermé la feuille de paiement : ce n'est pas une erreur à afficher. */
export function isCancelled(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { userCancelled?: boolean }).userCancelled === true;
}

/** Offres du store pour ce compte ; le merci unique est facultatif (absent si le produit n'existe pas). */
export async function loadSupportOffers(ownerId: string): Promise<SupportOffer[]> {
  const Purchases = await purchasesFor(ownerId);
  const [offerings, tips] = await Promise.all([
    Purchases.getOfferings(),
    Purchases.getProducts([TIP_PRODUCT], sdkModule().PRODUCT_CATEGORY.NON_SUBSCRIPTION).catch(() => []),
  ]);
  return supportOffers(offerings.current?.availablePackages ?? [], tips[0] ?? null);
}

export async function buySupportOffer(ownerId: string, offer: SupportOffer): Promise<void> {
  const Purchases = await purchasesFor(ownerId);
  if (offer.package) await Purchases.purchasePackage(offer.package);
  else if (offer.product) await Purchases.purchaseStoreProduct(offer.product);
}

export async function restoreSupport(ownerId: string): Promise<void> {
  await (await purchasesFor(ownerId)).restorePurchases();
}

/** Réglages d'abonnement du store (résiliation, changement de formule). */
export async function manageSupport(ownerId: string): Promise<void> {
  await (await purchasesFor(ownerId)).showManageSubscriptions();
}
