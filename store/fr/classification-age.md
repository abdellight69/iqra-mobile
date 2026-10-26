# Classification d'âge et public cible

Ce que l'app contient : le texte du Coran, ses traductions, récitations et explications (sources
citées dans l'app), des exercices, la progression de l'utilisateur, des échanges limités au cercle
familial (messages d'un parent à son enfant sur le même compte, encouragements choisis dans une
liste entre membres d'une famille). Aucune violence, aucune sexualité, aucun langage grossier,
aucune substance, aucun jeu d'argent, aucun contenu d'horreur, pas d'accès libre au web, pas de
localisation, pas de contenu d'inconnus.

## Apple — questionnaire de classification (App Store Connect)

| Question | Réponse | Pourquoi |
| --- | --- | --- |
| Violence (dessin animé ou fantastique, réaliste, prolongée) | Aucune | contenu religieux et pédagogique |
| Contenu sexuel ou nudité ; langage grossier ou humour vulgaire ; thèmes d'horreur ou de peur ; alcool, tabac, drogues ; thèmes matures ou suggestifs | Aucun | |
| Jeux d'argent simulés ; jeux d'argent réels ; concours | Non | |
| Informations médicales ou de traitement | Non | |
| Accès web illimité | Non | aucun navigateur intégré ; seuls des liens vers eqra.fr s'ouvrent dans le navigateur du téléphone (conditions, confidentialité) |
| Contenu généré par les utilisateurs ou messagerie entre utilisateurs | Oui, limité | messages vocaux et écrits d'un parent à un profil enfant du **même compte** ; encouragements entre membres d'une famille, choisis dans une liste fermée (« BârakAllâhou fîk », « Continue, tu y es presque »…). Pas de texte libre entre comptes, pas d'inconnus : une famille se rejoint sur invitation ou code |
| Achats intégrés | Oui | abonnement Soutien et « merci », réservés au titulaire du compte, jamais visibles d'un profil enfant |
| Contrôle parental | Oui | code parent à 4 chiffres pour quitter un profil enfant ; profils enfants sans réglages, sans abonnement, sans familles |
| Contenu non filtré (« Unrestricted ») | Non | |
| **Conçue pour les enfants (Kids Category)** | **Non** | voir ci-dessous |

Résultat attendu : **4+**. Ne pas cocher « cette app est destinée aux enfants » ni s'inscrire dans
la catégorie Kids.

## Google — questionnaire IARC (Classification du contenu)

Catégorie d'application : **Référence, actualités ou application éducative** (pas « jeu »).

| Question IARC | Réponse |
| --- | --- |
| Violence, sang, contenu sexuel, nudité, langage, substances, horreur, discrimination | Non à tout |
| Jeux d'argent (simulés ou réels), achats de hasard (loot boxes) | Non |
| L'application permet-elle aux utilisateurs d'interagir ou d'échanger du contenu ? | **Oui** : messages d'un parent à son enfant (même compte), encouragements prédéfinis dans une famille, invitations par e-mail ou code. Préciser « cercle restreint, sur invitation » |
| Partage de la localisation de l'utilisateur | Non |
| Achats de biens numériques | **Oui** (abonnement Soutien, « merci ») |
| Contenu généré par les utilisateurs visible de tous | Non (famille et compte seulement) |
| Publicité | Non |

Résultat attendu : **PEGI 3 / Tous publics**, avec les mentions « Interactions entre
utilisateurs » et « Achats numériques » qu'IARC ajoute automatiquement.

## Google — « Public cible et contenu »

Tranches d'âge à cocher : **13–15, 16–17, 18 et plus**. Ne pas cocher 12 ans et moins.

Question « Votre application peut-elle attirer involontairement des enfants ? » : répondre
honnêtement **oui, elle peut plaire aux enfants** (missions, autocollants, mode enfant), et
expliquer dans le champ libre : les enfants n'utilisent l'app que par un profil créé et géré par
un parent titulaire du compte (15 ans et plus selon les conditions), sans compte propre, sans
e-mail, sans achat, sans contact avec des inconnus ; le titulaire voit toute leur progression.
Google peut alors demander de s'assurer que la fiche (captures, description) ne s'adresse pas
directement aux enfants : les légendes des captures enfants parlent aux parents (« Pour les
enfants : une mission par jour, préparée par un parent »), voir `captures.md`.

## Pourquoi ne pas viser la catégorie enfants au lancement

L'app est **tout public** : le compte appartient à un adulte (conditions : 15 ans et plus,
politique §7), qui crée des profils pour ses proches, enfants compris. Viser la catégorie Kids
(Apple) ou le programme Familles / « Conçu pour les enfants » (Google) imposerait des règles que
l'app ne remplit pas et n'a pas vocation à remplir au lancement :

- **Apple, règle 1.3 (Kids Category)** : pas de lien sortant de l'app ni d'achat sans barrière
  parentale, pas de connexion à un compte sans contrôle adapté, aucun identifiant transmis à un
  tiers. Eqra ouvre eqra.fr (conditions, confidentialité), propose un abonnement au titulaire,
  demande e-mail et mot de passe, et transmet un identifiant interne à RevenueCat.
- **Google, politique Familles** : tout SDK tiers doit être certifié pour les familles
  (RevenueCat ne l'est pas), la collecte de données personnelles d'enfants est très encadrée, et
  les fonctions sociales (familles, invitations, messages) doivent être conçues pour des mineurs.
  Déclarer une tranche d'âge inférieure à 13 ans fait entrer dans cette politique.
- **Mélange de publics** : un compte adulte avec profils enfants correspond au cas « application
  à public mixte » où les stores demandent une porte adulte (le code parent et les profils sans
  compte propre jouent ce rôle), pas à une app enfant.

Ce que l'app fait déjà et qu'on peut mettre en avant dans la revue : profils enfants sans e-mail
ni mot de passe, code parent haché, aucune publicité, aucun pistage, aucun contact avec des
inconnus, récitation de l'enfant supprimée après analyse (politique §7).

Si, plus tard, une version « enfant » autonome est voulue, il faudra une app distincte ou un
mode sans compte, sans liens sortants et sans achat, et une politique dédiée aux mineurs.
