# SudoTam

Sudoku classique en ligne, **installable sur smartphone** (PWA), avec comptes joueurs et
sauvegarde des parties dans **Firebase**. L'appli est hébergée sur **Vercel** :
https://sudoku-tam.vercel.app

## Fonctionnalités

- **6 niveaux** : Débutant (environ 60 chiffres visibles), Très facile, Facile, Moyen, Difficile, Extrême.
  Chaque grille a une **solution unique**.
- **Impression** : le bouton 🖨️ du jeu imprime la grille en cours (ou l'enregistre en PDF), avec le
  niveau, la date de début et la date d'impression.
- **Mes grilles** : génère des lots de 4 grilles d'un même niveau, imprimables ensemble sur une
  feuille A4 (avec l'avancement de chacune), plus une feuille de solutions séparée. Chaque grille se joue sur le
  téléphone quand on le souhaite ; une grille ne compte dans les stats qu'une fois jouée.
- **Solution** affichée après un abandon (bouton « Abandonner » sous la grille) : bons chiffres,
  erreurs corrigées, cases à trouver.
- Pendant la partie, le bouton **« Accueil »** ramène à l'accueil. Supprimer une partie issue
  d'un lot remet sa grille « à jouer ».
- **Accueil** : « Mes parties », « Classement » et « Mes grilles » en accès direct ; les réglages
  (thème, taille des chiffres, sons, administration, mot de passe, déconnexion) sont sous la roue
  crantée ⚙️.
- **Jeu tactile** au design inspiré de Sudoku.com : on touche une case, puis un chiffre.
  Outils Annuler, Effacer, Notes, et **10 bonus** par partie (chaque bonus remplit une case au
  hasard ; elle s'affiche en violet et ne peut plus être modifiée).
- **Vérification à la fin** : aucune aide pendant la partie. Quand la grille est pleine, les cases
  fausses passent en rouge pour être corrigées.
- **Chronomètre** avec pause. Il ne compte que le temps réellement joué (il s'arrête quand
  l'appli passe en arrière-plan).
- **Victoire** : les chiffres sautent de joie, un message défile, feux d'artifice et fanfare.
- **Classement** : meilleur temps de chaque joueur, par niveau.
- **Historique** personnel : date de début, niveau, statut (terminée avec le temps, abandonnée ou
  en cours), erreurs et bonus utilisés. Les parties en cours peuvent être reprises.
- **Administration** : ajout de joueurs (e-mail et mot de passe), modification, désactivation,
  e-mail de réinitialisation du mot de passe, et vue de toutes les parties.
- **Taille des chiffres** réglable (Normale, Grande, Très grande) dans le menu ou pendant la partie,
  mémorisée sur chaque appareil.
- **Mode sombre** (automatique, clair ou sombre) et **sons** désactivables.
- **Hors ligne** : les sauvegardes faites sans réseau sont envoyées automatiquement au retour de la
  connexion.

## Architecture

- `public/` : page, styles, icônes, manifeste PWA et service worker
- `src/` : code de l'appli, regroupé par esbuild dans `public/build/app.js`
  - `app.js` : interface (écrans, jeu, admin)
  - `firebase.js` : connexion et accès à Firestore
  - `sudoku.js` : générateur et solveur
  - `config.js` : configuration Firebase et UID de l'administrateur principal
- `firestore.rules` : règles de sécurité Firestore
- `vercel.json` : build et hébergement Vercel

### Données Firestore

- `players/{email}` : fiche d'un joueur autorisé (`name`, `isAdmin`, `active`, `uid`). Seul un
  administrateur peut en créer. Un compte de connexion sans fiche ne peut **rien** lire ni écrire.
- `games/{id}` : une partie (`uid`, `playerName`, `level`, `status`, grilles, `elapsedSeconds`,
  `hintsLeft`, `errors`, `startedAt`, `finishedAt`, et `lotId`/`lotIndex` si elle vient d'un lot).
- `lots/{id}` : 4 grilles imprimables (`uid`, `level`, `puzzles`, `solutions`, `gameIds`).

## Mise en place (déjà faite)

1. Projet Firebase `sudoku-tam` : Authentication avec le fournisseur **E-mail/Mot de passe**,
   et base **Firestore**.
2. **Règles de sécurité** : copier le contenu de `firestore.rules` dans la console Firebase
   (*Firestore Database → Règles*), puis cliquer sur **Publier**. À refaire à chaque modification
   de ce fichier.
3. Vercel importe le dépôt GitHub. Chaque push sur `main` met le site en ligne, et chaque autre
   branche donne un lien d'aperçu.

Au premier lancement, l'administrateur principal (UID défini dans `src/config.js` et
`firestore.rules`) choisit son nom de joueur. Il peut ensuite ajouter les joueurs depuis
**Menu → Administration**.

## Développement local

En local (`localhost`), l'appli utilise les **émulateurs Firebase** (Java requis) et ne touche
pas aux vraies données.

```bash
npm install
npm run emulators         # terminal 1 : émulateurs Auth + Firestore
npm run dev               # terminal 2 : compile src/ en continu
npx serve -l 5173 public  # terminal 3 : sert l'appli sur http://localhost:5173
```

Tests :

```bash
npm test             # générateur de grilles
npm run test:rules   # règles de sécurité Firestore (dans l'émulateur)
```
