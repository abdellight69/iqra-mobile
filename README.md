# Iqra — application mobile

Application React Native (Expo SDK 58, Expo Router, TypeScript) pour Android et iOS.

## Fonctionnalités

| Onglet | Contenu |
|---|---|
| **Accueil** | Objectif quotidien (XP), série de jours, reprise de lecture, révisions du jour |
| **Coran** | 114 sourates, lecture verset par verset avec traduction française, mode mot à mot, taille du texte, signets, récitation continue avec défilement automatique, présentation de chaque sourate |
| **Mot (au toucher)** | Audio du mot, phonétique, traduction, analyse grammaticale segment par segment (FR + AR), racine et lemme avec nombre d'occurrences, versets de la même racine, lien vers la fiche du lexique |
| **Mémoriser** | Plans par sourate entière ou plage de versets ; écoute répétée (×1/×3/×5), masquage progressif (texte → premières lettres → masqué), récitation puis auto-évaluation ; révisions espacées (SM-2) |
| **Vocabulaire** | Parcours façon Duolingo sur les 47 fiches de « 80% des mots du Qour'ân » : présentation des mots, QCM arabe→français et français→arabe, association de paires, erreurs reproposées, XP, révisions espacées |
| **Profil** | Statistiques, activité de la semaine, réglages (traduction, récitateur, objectif), mot de passe, suppression du compte |

Également : phonétique des versets et des mots, part de chaque sourate reconnue avec les mots connus surlignés, surlignage du mot récité pendant l'écoute, parcours « Comprendre sa prière », jour de répit hebdomadaire pour la série, rappel quotidien (notifications locales), et **mode hors ligne** : sourates téléchargées (texte, traduction, phonétique, récitation), données du compte gardées sur l'appareil, auto-évaluations de mémorisation envoyées à la reconnexion.

Authentification complète : inscription, connexion, mot de passe oublié (lien profond `iqra://reset-password?token=…`), sessions persistées dans le trousseau (expo-secure-store) avec rafraîchissement automatique des jetons.

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
