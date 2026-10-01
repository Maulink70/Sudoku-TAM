# Sudoku-TAM

Sudoku classique en ligne, **installable sur smartphone** (PWA), avec comptes joueurs et
sauvegarde des parties sur le serveur.

## Fonctionnalités

- **4 niveaux** : Facile, Moyen, Difficile, Extrême. Chaque grille a une **solution unique**.
  Facile et Moyen se résolvent par simple logique ; Extrême demande des techniques avancées.
- **Jeu tactile** : touchez une case puis un chiffre du pavé. Lignes, colonnes, blocs et chiffres
  identiques sont surlignés ; les erreurs s'affichent en rouge.
- **Outils** : Annuler, Effacer, Notes (crayon) et **10 bonus** par partie (chaque bonus remplit
  une case au hasard).
- **Chronomètre** avec pause ; il s'arrête automatiquement quand l'application passe en arrière-plan.
- **Victoire** : tous les chiffres sautent de joie, un message défile et des feux d'artifice partent.
- **Comptes** : connexion par e-mail et mot de passe. Seul l'administrateur crée les comptes.
- **Sauvegarde serveur** automatique : on peut quitter et reprendre une partie plus tard.
- **Historique** pour chaque joueur, avec ses meilleurs temps par niveau.
- **Administration** : création, modification, désactivation et suppression des joueurs ;
  changement de mot de passe ; liste de toutes les parties (date de début, joueur, niveau, statut
  avec temps de jeu, erreurs, bonus), filtrable par statut et par joueur.

Chaque partie enregistrée contient la date de début, le joueur, le niveau et le statut :
**Terminée** (avec le temps de résolution), **Abandonnée** ou **En cours**.

## Démarrage rapide

Node.js **22.13 ou plus récent** est nécessaire (la base SQLite intégrée à Node est utilisée).

```bash
npm install
ADMIN_EMAIL=moi@exemple.fr ADMIN_PASSWORD=motdepasse ADMIN_NAME="Mon nom" npm start
```

Ouvrez ensuite http://localhost:3000. Au premier démarrage, le compte administrateur est créé
avec `ADMIN_EMAIL` et `ADMIN_PASSWORD`. Connectez-vous avec, puis allez dans **Menu →
Administration** pour créer les comptes des joueurs.

Vous pouvez aussi créer des comptes en ligne de commande :

```bash
npm run create-user -- joueur@exemple.fr sonmotdepasse "Prénom"
npm run create-user -- --admin admin@exemple.fr motdepasse "Admin"
```

## Variables d'environnement

| Variable | Rôle | Défaut |
| --- | --- | --- |
| `PORT` | Port HTTP | `3000` |
| `DB_PATH` | Fichier SQLite | `data/sudoku.db` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Compte admin créé si la base est vide | — |
| `SESSION_SECRET` | Clé de signature des sessions | générée et stockée en base |

## Installer l'application sur le téléphone

L'application doit être servie en **HTTPS**, ce que tous les hébergeurs ci-dessous fournissent.

- **Android (Chrome)** : Menu → *Installer l'application*, ou utilisez le bouton
  *Installer l'application* du menu d'accueil.
- **iPhone (Safari)** : bouton *Partager* → *Sur l'écran d'accueil*.

## Mise en ligne

Le serveur est une application Node unique qui stocke tout dans un fichier SQLite. Il faut donc un
hébergement avec un **disque persistant**.

- **Docker** (VPS, NAS…) :
  ```bash
  docker build -t sudoku-tam .
  docker run -d -p 3000:3000 -v sudoku-data:/data \
    -e ADMIN_EMAIL=moi@exemple.fr -e ADMIN_PASSWORD=motdepasse sudoku-tam
  ```
- **Railway / Render / Fly.io** : déployez ce dépôt avec la commande `npm start`, attachez un volume
  persistant (par exemple monté sur `/data`) et définissez `DB_PATH=/data/sudoku.db` ainsi que les
  variables `ADMIN_*`.

> Les hébergements « serverless » sans disque (Netlify Functions, Vercel) ne conviennent pas tels
> quels, car le fichier SQLite y serait perdu.

## Développement

```bash
npm run dev   # redémarre automatiquement le serveur à chaque modification
npm test      # tests du générateur et de l'API
```

Structure :

- `server/sudoku.js` : générateur et solveur
- `server/index.js` : API REST et fichiers statiques
- `server/auth.js` : mots de passe (scrypt) et sessions (cookie signé)
- `server/db.js` : schéma SQLite
- `public/` : interface (HTML/CSS/JS sans framework), manifeste PWA, service worker et icônes
