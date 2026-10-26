import { VerifyEmail } from "@/components/VerifyEmail";

/**
 * Hors connexion : le même lien que côté app. La route existe dans les deux groupes pour
 * qu'expo-router renvoie ici quand `(app)` est protégé (et inversement une fois connecté).
 */
export default function VerifyEmailScreen() {
  return <VerifyEmail standalone />;
}
