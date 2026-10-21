# Eqra — application mobile

Application React Native (Expo SDK 58, Expo Router, TypeScript) pour Android et iOS.

## Fonctionnalités

| Onglet | Contenu |
|---|---|
| **Accueil** | Objectif quotidien (XP), série de jours, reprise de lecture, révisions du jour |
| **Coran** | 114 sourates, lecture verset par verset avec traduction française, mode mot à mot, taille du texte, signets, récitation continue avec défilement automatique, présentation de chaque sourate |
| **Mot (au toucher)** | Audio du mot, phonétique, traduction, analyse grammaticale segment par segment (FR + AR), racine et lemme avec nombre d'occurrences, versets de la même racine, lien vers la fiche du lexique |
| **Mémoriser** | Plans par sourate entière ou plage de versets ; écoute répétée (×1/×3/×5), masquage progressif (texte → premières lettres → masqué), récitation puis auto-évaluation ; révisions espacées (SM-2) |
| **Vocabulaire** | Parcours façon Duolingo sur les 47 fiches de « 80% des mots du Qour'ân » : présentation des mots, QCM arabe→français et français→arabe, association de paires, erreurs reproposées, XP, révisions espacées |
| **Profil** | Statistiques, activité de la semaine, profils de la famille (jusqu'à 6, code parent, **profil enfant** : sans réglages ni compte, barre d'onglets plus grande, séances courtes), réglages (traduction, récitateur, objectif), mot de passe, suppression du compte |

Également : phonétique des versets et des mots, part de chaque sourate reconnue avec les mots connus surlignés, surlignage du mot récité pendant l'écoute, parcours « Comprendre sa prière », jour de répit hebdomadaire pour la série, rappel quotidien (notifications locales), et **mode hors ligne** : sourates téléchargées (texte, traduction, phonétique, récitation), données du compte gardées sur l'appareil, auto-évaluations de mémorisation envoyées à la reconnexion.

**Widgets d'écran d'accueil** (iOS 17+ via WidgetKit, Android via `react-native-android-widget`) : objectif du jour, série, révisions dues et reprise de lecture. L'app écrit un instantané (`src/lib/widget.ts`) à chaque passage sur l'accueil ; le widget ne parle jamais au serveur. iOS : cible SwiftUI dans `targets/widget/` (plugin `@bacons/apple-targets`, groupe d'applications `group.app.eqra.mobile` ; `ios.appleTeamId` renseigné dans `app.json`). Android : arbre React dans `src/widgets/`, gestionnaire enregistré dans `index.js`. Les widgets exigent une version de développement (pas Expo Go).

Authentification complète : inscription, connexion, mot de passe oublié (lien profond `eqra://reset-password?token=…`), sessions persistées dans le trousseau (expo-secure-store) avec rafraîchissement automatique des jetons.

## Démarrage

```bash
npm install
cp .env.example .env        # puis renseigner EXPO_PUBLIC_API_URL
npx expo start              # Expo Go, ou un development build
```

Le backend (`../backend`) doit tourner et être joignable depuis le téléphone.

`npm run ios` / `npm run android` ouvrent l'app dans **Expo Go**, qui contient déjà tous les modules utilisés (audio, fichiers, notifications locales). Un *development build* (`npx expo run:ios`) n'est utile que pour publier ; avec Expo SDK 58 il exige **Xcode 26** (Swift 6.2). Il génère les dossiers `ios/` et `android/` (ignorés par git) et remplace les scripts `ios` / `android` de `package.json` : ne pas valider ce changement.

## Qualité

```bash
npm run typecheck
npm run lint
npx expo export --platform android   # vérifie que le bundle se construit
```

## Structure

```
src/
  app/                 Routes (Expo Router)
    (auth)/            Accueil, connexion, inscription, mot de passe oublié/réinitialisation
    (app)/(tabs)/      Accueil, Coran, Mémoriser, Vocabulaire, Profil
    (app)/surah/[id]   Lecteur de sourate
    (app)/word/[location]  Fiche d'un mot (feuille modale)
    (app)/learn/       Fiche de leçon et séance d'apprentissage
    (app)/memorize/    Création de plan, détail, séance de mémorisation
  components/          Composants d'interface réutilisables
  lib/                 Client API, store d'authentification, requêtes (TanStack Query), audio, thème
```

## Build

`eas.json` contient des profils `development`, `preview` et `production` : `npx eas-cli@latest build --profile preview --platform android`.

Build local Android (APK installée sur un téléphone de test) : `npx expo prebuild --platform android` puis
`cd android && ./gradlew assembleRelease` → `android/app/build/outputs/apk/release/app-release.apk`.

**Signature Android.** Les builds release sont signés avec le keystore d'Eqra, qui vit **hors du dépôt** :
`~/.eqra/eqra-release.keystore` et `~/.eqra/eqra-release.properties` (`storeFile`, `storePassword`,
`keyAlias`, `keyPassword`). Le plugin `plugins/withReleaseSigning.js` l'injecte dans `app/build.gradle` à
chaque `prebuild` ; sans ce fichier, le build release échoue (plus jamais d'APK signée avec la clé de debug).
**Sauvegarder ces deux fichiers** (gestionnaire de mots de passe, disque chiffré) : perdus, plus aucune mise
à jour ne pourra être installée par-dessus l'app existante. Empreinte SHA-256 du certificat :
`95:E6:4F:35:DD:6C:82:63:60:41:41:D3:5F:F9:B1:61:0F:2C:95:9E:62:CB:8C:07:43:D7:81:A4:FD:4C:FB:8D`.

**Versions.** Incrémenter `android.versionCode` et `ios.buildNumber` dans `app.json` à chaque livraison
(Android refuse d'installer un APK dont le `versionCode` n'augmente pas), `version` quand l'app change
visiblement.
