// Signature des builds Android release avec le keystore d'Eqra, qui vit HORS du dépôt :
// ~/.eqra/eqra-release.properties (storeFile, storePassword, keyAlias, keyPassword) et le
// keystore qu'il désigne. Le dossier android/ étant généré (prebuild), c'est ce plugin qui
// injecte la configuration dans app/build.gradle à chaque génération.
//
// Sans ce fichier, un build release échoue explicitement : plus jamais d'APK signée avec la clé
// de debug (commune à tous les SDK Android, donc usurpable).
const { withAppBuildGradle } = require("expo/config-plugins");

const RELEASE_CONFIG = `
    signingConfigs {
        release {
            def releaseProps = new Properties()
            def releasePropsFile = new File(System.getProperty("user.home"), ".eqra/eqra-release.properties")
            if (!releasePropsFile.exists()) {
                throw new GradleException("Keystore Eqra absent : " + releasePropsFile + " (voir README, « Signature Android »)")
            }
            releasePropsFile.withInputStream { releaseProps.load(it) }
            storeFile file(releaseProps["storeFile"])
            storePassword releaseProps["storePassword"]
            keyAlias releaseProps["keyAlias"]
            keyPassword releaseProps["keyPassword"]
        }
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    let gradle = mod.modResults.contents;
    if (!gradle.includes("eqra-release.properties")) {
      // D'abord le type de build release (dans buildTypes), pas le bloc signingConfigs injecté ensuite.
      const signed = gradle.replace(
        /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
        "$1signingConfig signingConfigs.release",
      );
      if (signed === gradle) {
        throw new Error(
          "withReleaseSigning : type de build release introuvable dans app/build.gradle",
        );
      }
      gradle = signed.replace(/\n    signingConfigs \{\n/, RELEASE_CONFIG);
      if (!gradle.includes("eqra-release.properties")) {
        throw new Error(
          "withReleaseSigning : bloc signingConfigs introuvable dans app/build.gradle",
        );
      }
    }
    mod.modResults.contents = gradle;
    return mod;
  });
};
