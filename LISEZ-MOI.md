# Étincelle : mode d'emploi

Étincelle est la suite à la maison des ateliers BRILLE (Main tendue pour les parents, Lueur pour les enfants). Application installable sur téléphone, sans serveur, sans compte : les bilans des familles restent dans leur téléphone.

## 1. Mettre à jour le site sur GitHub

Tous les fichiers sont au même niveau (pas de dossier).

1. Dézippez `etincelle.zip`.
2. Sur la page de votre dépôt GitHub, cliquez sur **Add file**, puis **Upload files**.
3. Glissez **tous les fichiers** du dossier dézippé. GitHub remplace ceux qui portent déjà le même nom et ajoute les nouveaux.
4. Cliquez sur **Commit changes**. Au bout d'une à deux minutes, l'adresse de votre site est mise à jour.

Le fichier `rendezvous.json` n'est plus utilisé : vous pouvez le supprimer sur GitHub (ouvrez-le, puis le menu « ... » en haut à droite, puis **Delete file**), ou le laisser, il ne gêne pas.

## 2. Modifier les contenus (sans coder)

Les textes sont dans trois fichiers (le quatrième, `formes.json`, ne se modifie pas). Sur GitHub, ouvrez le fichier, cliquez sur le crayon, modifiez le texte entre guillemets, puis **Commit changes**.

- `petales.json` : les 7 pétales (titres parent et enfant, explications, pratiques, phrases) et l'activité « À faire ensemble » de chacun.
- `defis.json` : les défis hebdomadaires (un par semaine, en boucle).
- `formes.json` : les contours des pétales, tracés depuis votre fleur. Ne le modifiez pas.
- `config.json` : message d'accueil, coordonnées, et `debutDefis` (la date du lundi où le premier défi commence).

Attention aux virgules et aux guillemets : ne supprimez pas ceux qui entourent les textes.

Si vous modifiez `index.html`, `app.js` ou `style.css`, changez aussi le numéro dans `sw.js` (`etincelle-v10` devient `etincelle-v11`) pour que les téléphones prennent la nouvelle version.

## 3. Les images

Les pictogrammes des pétales (`p-*.png`) sont extraits de votre fleur : vérifiez les droits d'usage de ces illustrations, notamment si elles viennent d'une banque d'images qui demande de citer l'auteur.


## Accès par code famille
- Chaque pétale est chiffré dans `contenu.enc.json` : une famille n'ouvre que les pétales vécus en atelier. Les codes sont gérés avec le fichier PRIVÉ `gestion-des-acces.html` (à garder sur votre ordinateur, jamais sur GitHub).
- Ne publiez JAMAIS `petales.json`, `defis.json` ni le carnet des familles.


## Accès payant (familles hors centre)
La vente est **désactivée** tant que `config.json` contient `"actif": false` dans le bloc `achat`.

**Mise en place (une seule fois)** : suivez le guide « Encaisser les accès Étincelle avec Stripe ».
1. Complétez les passages surlignés en jaune de `legal.html` (SIRET, adresse, médiateur, dates).
2. Dans `config.json`, collez le lien de paiement Stripe de chaque offre dans `"lien"`. Passez `"actif"` à `true`.
3. Changez le numéro de version dans `sw.js` (`etincelle-v15` devient `etincelle-v18`, et ainsi de suite à chaque mise à jour), puis publiez tous les fichiers sur GitHub (y compris `merci.html` et `legal.html`).

**Créer un stock de codes** : espace ingénieure, « Gérer les familles », nom « Achat », nombre 20, tous les pétales cochés, case « pour la vente » cochée, « Créer le code ». Puis « Préparer les fichiers à publier » et déposez les deux fichiers sur GitHub. Faites aussi « Télécharger une copie de mon carnet » et gardez-la en lieu sûr.

**Après chaque paiement (2 minutes)** : vous recevez un e-mail de Stripe. Dans « Gérer les familles », saisissez le nom ou l'e-mail de l'acheteur, cliquez sur « Copier le message du prochain code », collez-le dans un e-mail à l'acheteur. Le code est marqué « envoyé » et le stock se met à jour.

**À savoir**
- Le tarif solidaire et la fleur complète ouvrent la même chose : ils piochent dans le même stock. Pour un accès de 5 ans, créez le code avec la durée « 5 ans » et écrivez « 5 ANS » devant l'e-mail de l'acheteur, pour le retrouver plus tard.
- Un pétale à l'unité demande un code créé à part (seul le pétale choisi est coché), à publier avant l'envoi.
- Un an après l'ajout d'un code (la date est affichée), retirez-le si la famille ne renouvelle pas, puis republiez.
- Un code peut être partagé : les conditions l'interdisent. En cas d'abus, retirez-le et republiez.
- Remboursement : dans Stripe, puis « Retirer » le code dans « Gérer les familles » et republiez.


## Version jeu (sons, étincelles, missions)
- Nouveaux fichiers à publier avec les autres : `jeu.js` et `jeu.css`. `index.html` et `sw.js` ont été mis à jour (`sw.js` est passé à `etincelle-v18`).
- Le jeu ne modifie ni les codes d'accès ni les contenus chiffrés : il s'ajoute par-dessus ce que l'application affiche.
- Les points, niveaux et badges restent dans le téléphone de la famille (clé `brille-etincelle-jeu`).
- Le dossier `_avant-jeu` contient les anciens `index.html` et `sw.js` : ne le publiez pas, vous pouvez le supprimer quand vous êtes sûre de garder cette version.


## Protection des contenus (ajoutée le 30 oct.)
- Filigrane : sur chaque page, le nom de l'accès (« Accès : … · BRILLE · usage personnel ») apparaît en transparence pour les familles, pas pour votre accès ingénieure. Le nom vient de « Gérer les familles » : il apparaît après une nouvelle publication de `acces.json` et `contenu.enc.json`.
- Copier-coller, clic droit et impression sont bloqués pour les familles (une capture d'écran reste possible).
- « Conditions d'utilisation » dans l'onglet Plus, et « Tous droits réservés » en pied de page.
- Extrait gratuit : créez un groupe « Découverte gratuite » avec un seul pétale, puis collez son code dans `config.json`, ligne `"codeDecouverte"`. Un bouton « Découvrir un extrait gratuit » apparaît sur l'écran d'entrée.
- Version du service worker : `etincelle-v21`. La prochaine sera `etincelle-v22`.

## Fin d'accès automatique (v20)
Dans « Gérer les familles », choisissez une durée à la création du code (sans limite, 12 mois, 5 ans) ou modifiez la date « Fin d'accès » d'une famille, puis « Préparer les fichiers » et déposez-les sur GitHub. À la date, le code cesse d'ouvrir l'application. Ton accès ingénieure n'expire jamais.
Attention : pour un lot de codes « vente », la durée compte à partir de la création du lot.

**Ne déposez plus d'ancien zip par-dessus : cette version contient les jeux.**


## Parcours d'un mois par pétale (v22)
- Chaque pétale propose un parcours de 4 semaines (une mission à vivre à deux par semaine, suivi dans le téléphone) et un « rituel qu'on garde » à la fin.
- Le contenu est dans `parcours-mensuels-PRIVE.json` : fichier PRIVÉ, à garder sur votre ordinateur, jamais sur GitHub.
- Pour l'ajouter : ouvrez l'application avec votre accès ingénieure, onglet Plus, « Gérer les familles », carte « Ajouter les parcours d'un mois », choisissez le fichier. Puis « Préparer les fichiers à publier » et déposez `acces.json` et `contenu.enc.json` sur GitHub avec les fichiers de ce dossier (`app.js`, `style.css`, `sw.js`). Les codes existants continuent de fonctionner.
- Les parcours restent chiffrés : seules les familles ayant le pétale les voient.
- Version du service worker : `etincelle-v22`.
- Jeu : chaque semaine du parcours vécue rapporte 6 étincelles (une seule fois par semaine et par pétale), le mois complet 15 étincelles et le badge « Un mois ensemble ». Publiez aussi `jeu.js`.
- Parcours : une semaine ne s'ouvre que lorsque la précédente a été vécue. Chaque semaine a son bouton « Lancer la mission » (pas à pas) ; la fin du mois déclenche une grande fête (pluie de pétales, médaille, badge) et une carte souvenir avec les prénoms (facultatif). Publiez aussi `jeu.css`.
- Un pétale dont le parcours d'un mois est terminé reçoit une médaille 🏅 et un contour doré sur la fleur d'accueil, et une médaille dans la liste des pétales.


## Version 23 (5 nov. 2026) : accueil, famille, bilan imprimable
- **Où est la version de référence** : le dossier « Étincelle – version finale » sur Google Drive. C'est lui qu'on met à jour, depuis n'importe quel ordinateur, puis qu'on publie sur GitHub.
- Accueil : signature « Rindra Tsiory · Fondatrice de BRILLE » sous le mot de l'ingénieure ; bannière « L'aventure BRILLE commence maintenant ! » (le texte explicatif a été retiré).
- Message secondaire pour les familles qui n'ont pas suivi d'atelier : `messageHorsAtelier` dans `config.json` (modifiable sans coder).
- « Notre famille » : prénom du parent + prénoms des enfants, sans limite. Tous les prénoms apparaissent sur la carte souvenir, le pétale à coller et la fleur d'aventure (la taille s'adapte). Les prénoms restent dans le téléphone.
- Bilan de la semaine : le parent indique combien d'enfants ont répondu (avec la remarque « en groupe, c'est ça aussi une famille épanouie ensemble ») et peut imprimer ou enregistrer en PDF une feuille A4 archivable, avec l'historique des semaines précédentes.
- « À propos d'Étincelle » : reformulé (la QVE est pensée pour l'enfant ; le parent qui revient de Main tendue prolonge à la maison avec son enfant).
- Fichiers modifiés : `app.js`, `style.css`, `config.json`, `sw.js` (`etincelle-v23`), `legal.html`. La prochaine version de `sw.js` sera `etincelle-v24`.
- Les fichiers PRIVÉS (`gestion-des-acces.html`, `petales.json`, `defis.json`, `parcours-mensuels-PRIVE.json`, carnet des familles) ne sont jamais sur GitHub : gardez-les dans le dossier Drive PRIVÉ.

## Version 24 (5 nov. 2026, soir)
- Mot de l'ingénieure : guillemet seul retiré.
- Tableau « Niveau Graine » : couleurs BRILLE pastel (plus de dégradé), placé sous la fleur.
- Accueil : texte élargi jusqu'au dessin de la famille.
- « Notre famille » : champ prénom et bouton « Ajouter » rééquilibrés.
- Bilan : une ligne de visages par enfant (prénom ou « Enfant 2 »…), enregistrée et imprimée avec le bilan.
- Fichiers modifiés : app.js, jeu.js, jeu.css, style.css, sw.js (etincelle-v24). Prochaine version du sw : v25.
