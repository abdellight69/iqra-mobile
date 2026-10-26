# Fiches des stores — App Store et Google Play

Tout ce qui est saisi dans App Store Connect et la Play Console, en français, rédigé d'après la
page de présentation (`iqra-website/index.html`) et la politique de confidentialité
(`iqra-website/confidentialite/index.html`) : rien n'est promis que l'app ne fait pas.

| Fichier | Contenu |
| --- | --- |
| `fr/description.md` | Nom, sous-titre (iOS) / description courte (Android), description longue, mots-clés iOS, texte promotionnel, « nouveautés » de la 1.0.0, catégories, adresses |
| `fr/confidentialite-labels.md` | Réponses aux questionnaires Apple « Confidentialité de l'app » et Google « Sécurité des données », avec la justification tirée de la politique |
| `fr/classification-age.md` | Classification d'âge (Apple, IARC pour Google), public cible, et pourquoi ne pas viser la catégorie enfants |
| `fr/captures.md` | Les 8 captures à fournir, leurs légendes et les formats attendus ; les fichiers sont déposés dans `captures/` par la session principale |
| `captures/` | Les images (PNG), nommées comme dans `fr/captures.md` |

## Identité de l'app (source : `app.json`)

| | iOS | Android |
| --- | --- | --- |
| Identifiant | bundle `app.eqra.mobile`, Team ID `8TSDHC2926` | package `app.eqra.mobile` |
| Version | `1.0.0`, build `5` | `1.0.0`, versionCode `5` |
| Schéma | `eqra://` | `eqra://` |
| Liens universels | `applinks:eqra.fr` (`ios.associatedDomains`) | `intentFilters` `autoVerify` sur `https://eqra.fr/rejoindre/`, `/verifier/`, `/reinitialiser/`, `/s/` |
| Chiffrement | `usesNonExemptEncryption: false` (HTTPS seulement : pas de déclaration d'export) | — |
| Signature | certificat de distribution Apple (Team `8TSDHC2926`) | clé de `plugins/withReleaseSigning.js` ; empreinte SHA-256 déclarée dans `iqra-website/.well-known/assetlinks.json` |

Adresses communes : site `https://eqra.fr/`, confidentialité `https://eqra.fr/confidentialite/`,
conditions `https://eqra.fr/conditions/`, contact `akdimabdelali@gmail.com` (celui de la politique).
Éditeur : Abdelali Akdim, entrepreneur individuel, Roubaix (France).

## Avant de soumettre (les deux stores)

1. **Liens universels en ligne** : `https://eqra.fr/.well-known/apple-app-site-association` et
   `…/assetlinks.json` répondent (et en `application/json` pour le premier) ; `/s/112/1` répond 200.
   Les règles nginx sont décrites dans `iqra-website/README.md`, « Liens universels ». iOS lit le
   fichier à l'installation de l'app, Android à l'installation également : sans lui, les liens
   `https://eqra.fr/…` ouvrent le navigateur, jamais l'app.
2. **API de production** joignable (`EXPO_PUBLIC_API_URL` en `https://eqra.fr`) et e-mails
   (Brevo) en service : l'inscription envoie l'e-mail « Confirmez votre adresse », la vérification
   n'est pas bloquante (bandeau seulement).
3. **Compte de test pour la revue** : les deux stores exigent des identifiants quand l'app demande
   une connexion. Créer un compte dédié sur la production (titulaire + un profil enfant + une
   famille avec un objectif), le saisir dans « Informations pour l'examen » (Apple) et « Accès à
   l'application » (Google). Ne jamais écrire ces identifiants dans ce dépôt.
4. **Achats intégrés** créés et approuvés : abonnements `eqra_soutien_mensuel` (2,99 €/mois) et
   `eqra_soutien_annuel` (24,99 €/an) dans un groupe « Soutien », achat unique `eqra_merci`
   (`docs/soutien-v1.md`, `src/lib/purchases.ts`), reliés à RevenueCat. L'écran Soutien affiche
   déjà Conditions, Confidentialité, « Restaurer mes achats » et « Gérer mon abonnement »
   (règle Apple 3.1.2).
5. **Captures** dans `captures/` aux formats de `fr/captures.md` ; icône 1024 × 1024 (iOS, sans
   transparence) et 512 × 512 (Android) tirée de `assets/images/icon.png` ; bannière Google
   1024 × 500 à produire.
6. `npx tsc --noEmit`, `npx eslint .`, `npx jest --ci` verts ; `versionCode` / `buildNumber`
   incrémentés (README du dépôt, « Versions »).

## App Store Connect (iOS)

1. **App › Informations** : nom, sous-titre, catégorie principale « Éducation », secondaire
   « Références » (`fr/description.md`) ; droits sur le contenu : l'app affiche du contenu tiers
   sous licence (Quran.com, Tanzil CC BY 3.0, Quranic Arabic Corpus GPL, « 80 % des mots du
   Qour'ân » CC BY-NC-SA, QuranEnc) — répondre « oui, avec les droits nécessaires », sources citées
   dans l'app et sur le site.
2. **Confidentialité de l'app** : URL de la politique, puis le questionnaire de
   `fr/confidentialite-labels.md`.
3. **Classification** : questionnaire de `fr/classification-age.md` (résultat attendu : 4+).
4. **Version 1.0.0** : description, mots-clés, texte promotionnel, URL d'assistance
   (`https://eqra.fr/`), URL marketing, copyright « 2026 Abdelali Akdim », captures 6,7" et 6,5",
   nouveautés.
5. **Informations pour l'examen** : compte de test, et la note ci-dessous.
6. **Achats intégrés** rattachés à la version (groupe « Soutien » + `eqra_merci`), avec leurs
   captures d'écran de revue (écran Soutien).
7. Build envoyé par EAS (`npx eas-cli@latest build --profile production --platform ios`) ou Xcode,
   puis soumission.

## Play Console (Android)

1. **Fiche du Play Store** : nom, description courte, description longue (`fr/description.md`),
   icône 512 × 512, bannière 1024 × 500, captures téléphone, catégorie « Éducation », e-mail de
   contact, site.
2. **Contenu de l'application** (toutes les déclarations sont obligatoires) :
   - Politique de confidentialité : `https://eqra.fr/confidentialite/` ;
   - Accès à l'application : « Toutes les fonctionnalités ou une partie sont restreintes » →
     compte de test ;
   - Annonces : « Non, l'application ne contient pas d'annonces » ;
   - Classification du contenu : questionnaire IARC de `fr/classification-age.md` ;
   - Public cible et contenu : `fr/classification-age.md` (13 ans et plus, pas la catégorie
     Familles) ;
   - Applications d'actualités : non ; Application de suivi des contacts COVID : non ;
   - Sécurité des données : `fr/confidentialite-labels.md` ;
   - Fonctionnalités financières : non ; Applications gouvernementales : non ; Santé : non ;
   - Suppression du compte : dans l'app (Réglages › Supprimer mon compte) et par e-mail ; Google
     demande aussi une **adresse web** décrivant la procédure : indiquer
     `https://eqra.fr/confidentialite/` (section 6, « Vos droits »).
3. **Produits** : abonnements `eqra_soutien_mensuel`, `eqra_soutien_annuel` (formules de base
   mensuelle et annuelle), produit géré `eqra_merci` ; licences de test pour le compte de revue.
4. **Signature** : Play App Signing. Si Google re-signe l'app, l'empreinte à déclarer dans
   `assetlinks.json` est celle de la **clé de signature d'application** affichée dans
   Play Console › Intégrité de l'app, pas celle de la clé d'envoi.
5. **Test interne** avec l'AAB (`npx eas-cli@latest build --profile production --platform android`),
   puis production.

## Note pour les équipes de revue (à coller, en français puis en anglais)

> Eqra est une application d'apprentissage du Coran en français : lecture mot à mot avec
> récitation, mémorisation par répétition espacée, vocabulaire. Elle est gratuite et sans
> publicité ; l'abonnement « Soutien » est facultatif et ne débloque aucun contenu d'apprentissage
> (badge, deux thèmes de couleurs, nouveautés en avant-première).
> Le micro n'est demandé que pour « Récitation vérifiée » : l'enregistrement est transcrit sur
> notre serveur puis supprimé, seul le résultat mot par mot est conservé.
> Un compte (15 ans et plus) peut créer des profils pour ses proches, dont des profils enfants
> sans e-mail ni mot de passe, protégés par un code parent ; les enfants ne voient ni les réglages
> ni l'abonnement. L'app n'est pas destinée à la catégorie enfants.
> La confirmation de l'adresse e-mail n'est pas bloquante. Compte de test : voir le champ dédié.
> Les liens https://eqra.fr/rejoindre/, /verifier/, /reinitialiser/ et /s/ ouvrent l'app.

> Eqra is a French-language Quran learning app: word-by-word reading with recitation, spaced
> repetition memorization and vocabulary. It is free and ad-free; the optional "Soutien"
> subscription unlocks no learning content (a badge, two color themes, early access to news).
> The microphone is only used for "Verified recitation": the recording is transcribed on our
> server and deleted; only the per-word result is kept. An account (15+) can create profiles for
> relatives, including child profiles without e-mail or password, protected by a parent code;
> children never see settings or the subscription. The app does not target the Kids category.
> E-mail verification is not blocking. Test account: see the dedicated field.
> https://eqra.fr/rejoindre/, /verifier/, /reinitialiser/ and /s/ links open the app.
