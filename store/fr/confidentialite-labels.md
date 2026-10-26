# Confidentialité — réponses aux questionnaires des stores

Source unique : `iqra-website/confidentialite/index.html` (24 octobre 2026). Chaque ligne cite la
section de la politique qui la justifie. Principe : **aucun suivi, aucune publicité, aucune
revente** ; prestataires = sous-traitants (Hostinger, Brevo, RevenueCat), jamais des tiers qui
exploitent les données pour eux (§4).

## Ce que l'app traite (rappel, §2)

| Donnée | Où | Durée (§5) |
| --- | --- | --- |
| E-mail, mot de passe haché | compte du titulaire | tant que le compte existe |
| Prénom ou pseudo, couleur, réglages, objectifs | compte et profils | tant que le compte existe |
| Progression (XP, séries, mots, versets, révisions, position de lecture, signets et leurs notes) | compte et profils | tant que le compte existe |
| Récitation audio (récitation vérifiée, mission d'un enfant) | envoyée, transcrite en mémoire, **supprimée** ; seul le résultat par mot est gardé | non conservée |
| Messages vocaux et récitation modèle **du parent** (missions, notes de verset) | serveur, lisibles par les profils du compte seulement | tant que la mission ou la note existe |
| Messages écrits du parent, notes de verset | serveur | idem |
| Familles : nom, membres, objectifs, encouragements, e-mail d'une personne invitée | serveur | e-mail effacé à l'acceptation, invitations de plus de 30 jours purgées |
| Abonnement Soutien : état (actif, date de fin) relié à un identifiant interne | serveur + RevenueCat | tant que le compte existe |
| Jeton de session + User-Agent de l'appareil | serveur | 30 jours sans utilisation |
| Événements d'usage (nom, date, 2–3 précisions techniques ; ni IP, ni identifiant d'appareil) | serveur, lus en nombre seulement | 180 jours, supprimés avec le compte |
| Journaux techniques (IP, page, date) | serveur | 30 jours, sécurité |
| Session, préférences d'affichage et de rappel, widget, téléchargements | **sur l'appareil seulement** | — |

Pas de localisation, pas de contacts, pas de photos, pas d'identifiant publicitaire, aucun SDK
d'analyse ou de publicité. Le micro n'est utilisé que sur demande explicite (bouton « Réciter »).

## Apple — « Confidentialité de l'app » (App Store Connect)

**Collectez-vous des données dans cette app ? Oui.**

| Catégorie Apple | Type | Collecté | Lié à l'identité de l'utilisateur | Utilisé pour le suivi | Finalités | Justification |
| --- | --- | --- | --- | --- | --- | --- |
| Coordonnées | Adresse e-mail | oui | oui | non | Fonctionnalités de l'app | compte, réinitialisation, confirmation, invitations (§2, §3) |
| Coordonnées | Nom | oui | oui | non | Fonctionnalités de l'app | prénom ou pseudo du profil, vu des membres d'une famille (§2) |
| Contenu utilisateur | Données audio | oui | oui | non | Fonctionnalités de l'app | messages vocaux et récitation modèle **du parent**, conservés (§2) ; la récitation vérifiée, supprimée après analyse, n'est pas « collectée » au sens d'Apple (traitement le temps de la requête) mais le mentionner en note de revue |
| Contenu utilisateur | Autres contenus utilisateur | oui | oui | non | Fonctionnalités de l'app | message de mission, notes de verset, notes de signets, nom de famille, encouragements, progression d'apprentissage (§2) |
| Identifiants | Identifiant utilisateur | oui | oui | non | Fonctionnalités de l'app | identifiant interne du compte, transmis à RevenueCat pour l'abonnement (§2, §4) |
| Achats | Historique des achats | oui | oui | non | Fonctionnalités de l'app | état de l'abonnement Soutien et historique chez RevenueCat (§2, §4) |
| Données d'utilisation | Interaction avec le produit | oui | oui | non | Analyse (interne, sans tiers) | événements d'usage : ouverture, séance faite, mission réussie… (§2 « La mesure d'usage ») ; supprimés avec le compte, donc liés au compte même s'ils ne sont lus qu'en nombre |
| Diagnostic | Autres données de diagnostic | facultatif | non | non | Fonctionnalités de l'app | journaux serveur (IP, 30 jours, §5). Apple n'exige pas de déclarer une donnée qui n'est pas utilisée pour le suivi, n'est pas liée à l'utilisateur et ne sert qu'à la sécurité ; si on la déclare, ce libellé |

**Ne pas cocher** : Santé, Finances (le paiement passe par Apple), Localisation, Informations
sensibles, Contacts, Historique de navigation, Historique des recherches (la recherche dans
l'app n'est pas enregistrée), Identifiant de l'appareil, Données de plantage (aucun outil de
rapport de plantage), Publicité.

**Suivi (App Tracking Transparency)** : « Non, nous ne suivons pas » — aucune donnée n'est
reliée à des données de tiers à des fins publicitaires ni partagée avec un courtier (§3, §4).
Pas de demande d'autorisation ATT.

**Autorisations système demandées** (`app.json`) : micro (`expo-audio`, « Eqra écoute votre
récitation pour repérer les mots oubliés… »), notifications locales. Face ID : jamais demandée
(le texte d'`expo-secure-store` le dit).

## Google — « Sécurité des données » (Play Console)

**Votre application collecte-t-elle ou partage-t-elle des données utilisateur ? Oui.**
**Toutes les données sont-elles chiffrées en transit ? Oui (HTTPS, §8).**
**Proposez-vous un moyen de demander la suppression des données ? Oui** : Réglages › Supprimer mon
compte dans l'app, ou e-mail (§6) ; adresse web à indiquer : `https://eqra.fr/confidentialite/`.

| Catégorie Google | Type | Collecté | Partagé | Traité de façon éphémère | Obligatoire | Finalités | Justification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Informations personnelles | Nom | oui | non | non | oui (prénom ou pseudo) | Fonctionnalités de l'application, Gestion du compte | §2 |
| Informations personnelles | Adresse e-mail | oui | non | non | oui | Fonctionnalités, Gestion du compte | §2 ; Brevo l'utilise pour envoyer nos e-mails en tant que sous-traitant (§4), ce qui n'est pas un « partage » au sens de Google |
| Informations personnelles | Identifiants utilisateur | oui | non | non | oui | Fonctionnalités, Gestion du compte | identifiant interne, transmis à RevenueCat comme sous-traitant (§4) |
| Informations financières | Historique des achats | oui | non | non | non (abonnement facultatif) | Fonctionnalités | état de l'abonnement Soutien (§2) ; les coordonnées bancaires ne nous parviennent jamais |
| Audio | Enregistrements vocaux ou sonores | oui | non | non | non | Fonctionnalités | messages vocaux et récitation modèle du parent (§2) ; la récitation vérifiée est traitée en mémoire puis supprimée : Google ne demande pas de déclarer un traitement éphémère, mais la note de revue le précise |
| Activité dans l'application | Actions dans l'application | oui | non | non | oui | Analyse (interne), Fonctionnalités | événements d'usage (§2) ; progression d'apprentissage |
| Activité dans l'application | Autre contenu généré par l'utilisateur | oui | non | non | non | Fonctionnalités | messages de mission, notes de verset, notes de signets, encouragements, nom de famille (§2) |
| Messages | Autres messages dans l'application | oui | non | non | non | Fonctionnalités | messages écrits et vocaux du parent à son enfant, encouragements entre membres d'une famille (texte choisi dans une liste) |

**Ne pas cocher** : Localisation, Informations de santé et de forme physique, Contacts,
Calendrier, Photos et vidéos, Fichiers et documents, Historique de navigation, Historique des
recherches, Journaux de plantage, Diagnostics (pas d'outil de télémétrie ; les journaux serveur
avec IP, 30 jours, ne sont pas collectés par l'app : ils résultent de la connexion au serveur, que
Google exempte), Identifiants de l'appareil ou autres.

**Pratiques de sécurité** : chiffrement en transit, suppression possible, pas d'examen
indépendant (MASA) : ne pas cocher.

## Points à surveiller lors de la mise à jour de la politique

- Si un outil de rapport de plantage ou d'analyse tiers est ajouté un jour, les deux
  questionnaires changent (Données de plantage / Journaux de plantage, et « partagé » avec le
  tiers) et la politique aussi (§4).
- Si Google Play ou Apple est utilisé pour la connexion (Sign in with Apple, Google), les
  catégories d'identifiants changent. Aujourd'hui : e-mail + mot de passe seulement.
- Les réponses ci-dessus datent de la politique du 24 octobre 2026 ; les mettre à jour avec elle.
