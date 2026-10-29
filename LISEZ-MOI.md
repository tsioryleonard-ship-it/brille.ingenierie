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
3. Changez le numéro de version dans `sw.js` (`etincelle-v15` devient `etincelle-v16`, et ainsi de suite à chaque mise à jour), puis publiez tous les fichiers sur GitHub (y compris `merci.html` et `legal.html`).

**Créer un stock de codes** : espace ingénieure, « Gérer les familles », nom « Achat », nombre 20, tous les pétales cochés, case « pour la vente » cochée, « Créer le code ». Puis « Préparer les fichiers à publier » et déposez les deux fichiers sur GitHub. Faites aussi « Télécharger une copie de mon carnet » et gardez-la en lieu sûr.

**Après chaque paiement (2 minutes)** : vous recevez un e-mail de Stripe. Dans « Gérer les familles », saisissez le nom ou l'e-mail de l'acheteur, cliquez sur « Copier le message du prochain code », collez-le dans un e-mail à l'acheteur. Le code est marqué « envoyé » et le stock se met à jour.

**À savoir**
- Le tarif solidaire et la fleur complète ouvrent la même chose : ils piochent dans le même stock. Pour un accès à vie, écrivez « VIE » devant l'e-mail de l'acheteur, pour le retrouver plus tard.
- Un pétale à l'unité demande un code créé à part (seul le pétale choisi est coché), à publier avant l'envoi.
- Un an après l'ajout d'un code (la date est affichée), retirez-le si la famille ne renouvelle pas, puis republiez.
- Un code peut être partagé : les conditions l'interdisent. En cas d'abus, retirez-le et republiez.
- Remboursement : dans Stripe, puis « Retirer » le code dans « Gérer les familles » et republiez.
