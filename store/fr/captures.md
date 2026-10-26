# Captures d'écran des stores

Huit captures, prises dans l'app avec des données réelles (compte de démonstration), dans
l'ordre d'affichage. Les fichiers sont déposés par la session principale dans
`store/captures/` ; les captures enfant déjà présentes (`enfant-01-accueil-mission.png` …
`enfant-06-moi-autocollants.png`, 1080 × 2400) servent pour les cases 6 et 7.

Règle des légendes : une phrase courte posée en haut de l'image, qui parle à l'adulte (jamais
directement à l'enfant : voir `classification-age.md`, public cible). Aucun chiffre qui ne vienne
pas de l'app ou du site.

| # | Fichier | Écran à montrer | Légende |
| --- | --- | --- | --- |
| 1 | `01-accueil.png` | Accueil adulte : objectif du jour, série, reprise de lecture, plan du jour | Le Coran, mot à mot, à votre rythme |
| 2 | `02-lecteur-fatiha.png` | Lecteur sur Al-Fâtiha, mot à mot + phonétique, récitation en cours avec le mot surligné | Lisez et écoutez : le mot récité est surligné |
| 3 | `03-mot.png` | Fiche d'un mot (feuille) : audio, phonétique, traduction, grammaire, racine, occurrences | Touchez un mot pour le comprendre |
| 4 | `04-memoriser.png` | Séance de mémorisation : texte en masquage progressif, notes 0–5 ; ou l'onglet Mémoriser avec révisions du jour et plans | Mémorisez par répétition espacée |
| 5 | `05-recitation.png` | Récitation vérifiée : résultat mot par mot (mots réussis / oubliés) | Récitez : les mots oubliés sont repérés |
| 6 | `06-mots.png` | Séance de vocabulaire (choix ou association), ou l'onglet Apprendre avec les fiches et thèmes | Les mots les plus fréquents, fiche après fiche |
| 7 | `07-mission-enfant.png` | Mode enfant : accueil « Ta mission du jour » (Écouter, Répéter, Retenir, Jouer, message de Maman) — `enfant-01-accueil-mission.png` | Pour les enfants : une mission par jour, préparée par un parent |
| 8 | `08-famille.png` | Famille : objectifs de la semaine avec barres de progression et encouragements | En famille : des objectifs communs, jamais de classement |

Variante possible pour la case 8, si la famille de démonstration est vide : la page « Profils de
la famille » (jusqu'à six profils, mode enfant, code parent), légende « Un compte, plusieurs
profils ».

## Formats

### iOS (App Store Connect)

| Taille | Appareil | Pixels (portrait) | Obligatoire |
| --- | --- | --- | --- |
| 6,7" | iPhone 15 Pro Max / 14 Pro Max | 1290 × 2796 | oui (ou 6,9", 1320 × 2868, qu'Apple accepte pour cette case) |
| 6,5" | iPhone 11 Pro Max / XS Max | 1242 × 2688 ou 1284 × 2778 | oui, sauf si Apple la dérive automatiquement de la 6,7" (option proposée au téléversement) |

PNG ou JPEG, sans transparence, sans barre d'état trompeuse (heure 9:41, batterie pleine : le
simulateur le fait avec `xcrun simctl status_bar <udid> override --time 9:41 --batteryLevel 100`).
De 3 à 10 captures par taille ; les 8 ci-dessus. Prise sur le simulateur iPhone 16 Pro Max
(1320 × 2868) puis redimensionnée en 1290 × 2796 si besoin (`sips -z 2796 1290`), ou directement
sur iPhone 15 Pro Max.

iPad : l'app déclare `supportsTablet: true`, donc App Store Connect demande aussi des captures
iPad 13" (2064 × 2752) — soit les fournir (simulateur iPad Pro 13"), soit passer
`supportsTablet` à `false` avant le build. À décider par la session principale ; ce fichier ne
tranche pas.

### Android (Play Console)

| Élément | Format |
| --- | --- |
| Captures téléphone | PNG ou JPEG, 2 à 8, 16:9 ou 9:16, côté entre 320 et 3840 px ; 1080 × 2400 (9:20) est accepté mais, pour l'affichage optimisé de la fiche, Google demande 9:16 : recadrer en 1080 × 1920 ou garder 1080 × 2400 et renoncer à la mise en avant |
| Icône | 512 × 512 PNG 32 bits (depuis `assets/images/icon.png`) |
| Bannière (feature graphic) | 1024 × 500 JPEG ou PNG 24 bits, obligatoire : fond papier, nom « Eqra », sous-titre « Lire, comprendre, mémoriser le Coran » |
| Tablette 7" et 10" | facultatif |

Prises sur l'émulateur Pixel (1080 × 2400) ou l'APK de test ; les captures enfant existantes
sont à ce format.

## Pour prendre les captures

1. Compte de démonstration avec : une position de lecture (Al-Fâtiha), un plan de mémorisation
   avancé, quelques mots appris et à réviser, un profil enfant avec une mission du jour et un
   message vocal, une famille avec un objectif de la semaine.
2. Thème clair, taille de texte par défaut, langue du téléphone en français.
3. Même compte sur iOS et Android pour des fiches cohérentes.
4. Légendes ajoutées en post-production (outil au choix) avec les polices du site (Fraunces pour
   le titre, Inter pour le reste), sur fond papier `#F7F5F0`, encre `#15171A`, vert `#0F4F44`.
