import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Tant que l'API est servie en http:// (adresse IP du VPS, sans HTTPS), iOS bloque ces requêtes
 * dans une vraie compilation de l'app (App Transport Security) : Expo Go, lui, les autorise.
 * L'exception n'est ajoutée que pour une adresse en http:// ; avec une adresse en https://
 * (nom de domaine et certificat), elle disparaît d'elle-même. À ne pas publier telle quelle.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
  const insecureApi = apiUrl.startsWith("http://") && !/^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(apiUrl);
  if (!insecureApi) return config as ExpoConfig;
  return {
    ...(config as ExpoConfig),
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        // Seule clé : iOS ignore NSAllowsArbitraryLoads si NSAllowsLocalNetworking (ou une autre
        // exception « Allows… ») est aussi présente.
        NSAppTransportSecurity: { NSAllowsArbitraryLoads: true },
      },
    },
  };
};
