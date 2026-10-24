import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * L'API de production est en https:// : rien à ajouter. Seule une API de développement en http://
 * (localhost, ou une adresse de test) obtient les exceptions au trafic en clair : Android
 * (usesCleartextTraffic) et iOS (App Transport Security, qui bloque sinon ces requêtes dans une
 * vraie compilation de l'app). Un build de production avec une adresse en http:// les
 * embarquerait : ne jamais publier ainsi.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
  const insecureApi = apiUrl.startsWith("http://");
  // Compilation de production (EAS `production`, ou `gradlew assembleRelease` / archive Xcode avec
  // EQRA_RELEASE=1) : l'adresse de l'API doit exister et être en https, sinon le binaire embarquerait
  // l'adresse locale de développement ou une exception au trafic en clair.
  const production = process.env.EAS_BUILD_PROFILE === "production" || process.env.EQRA_RELEASE === "1";
  if (production && (!apiUrl || insecureApi)) {
    throw new Error(
      `EXPO_PUBLIC_API_URL doit être une adresse https en production (valeur actuelle : « ${apiUrl || "absente"} »).`,
    );
  }
  if (!insecureApi) return config as ExpoConfig;
  const expoBuildProperties = "expo-build-properties";
  const plugins = (config.plugins ?? []).map(
    (plugin): NonNullable<ExpoConfig["plugins"]>[number] => {
      if (!Array.isArray(plugin) || plugin[0] !== expoBuildProperties)
        return plugin;
      const options = (plugin[1] ?? {}) as {
        android?: Record<string, unknown>;
      };
      return [
        plugin[0],
        {
          ...options,
          android: { ...options.android, usesCleartextTraffic: true },
        },
      ];
    },
  );
  return {
    ...(config as ExpoConfig),
    plugins,
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
