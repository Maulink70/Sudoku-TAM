'use strict';

const path = require('node:path');
const express = require('express');
const { db } = require('./db');
const sudoku = require('./sudoku');
const auth = require('./auth');

const PORT = Number(process.env.PORT) || 3000;
const MAX_HINTS = 10;
const STATUSES = ['en_cours', 'terminee', 'abandonnee'];

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'Content-Security-Policy':
      "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'",
  });
  next();
});
app.use(auth.loadUser);

// ---------------------------------------------------------------------------
// Utilitaires

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const gridToString = (arr) => arr.join('');
const stringToGrid = (str) => [...str].map(Number);

function parseBoard(value) {
  const str = Array.isArray(value) ? value.join('') : String(value ?? '');
  if (!/^[0-9]{81}$/.test(str)) throw httpError(400, 'Grille invalide.');
  return str;
}

function parseNotes(value) {
  if (!Array.isArray(value) || value.length !== 81) return new Array(81).fill(0);
  return value.map((n) => (Number.isInteger(n) && n >= 0 && n <= 0x3fe ? n : 0));
}

function gameSummary(g) {
  return {
    id: g.id,
    level: g.level,
    levelLabel: sudoku.LEVELS[g.level]?.label ?? g.level,
    status: g.status,
    startedAt: g.started_at,
    updatedAt: g.updated_at,
    finishedAt: g.finished_at,
    elapsedSeconds: g.elapsed_seconds,
    hintsUsed: MAX_HINTS - g.hints_left,
    errors: g.errors,
    ...(g.player_name !== undefined && {
      playerName: g.player_name,
      playerEmail: g.player_email,
      userId: g.user_id,
    }),
  };
}

function gameDetail(g) {
  return {
    ...gameSummary(g),
    puzzle: stringToGrid(g.puzzle),
    solution: stringToGrid(g.solution),
    board: stringToGrid(g.board),
    notes: JSON.parse(g.notes),
    hintsLeft: g.hints_left,
  };
}

function findOwnGame(req) {
  const id = Number(req.params.id);
  const game = db.prepare('SELECT * FROM games WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!game) throw httpError(404, 'Partie introuvable.');
  return game;
}

// Enregistre l'état envoyé par le client (grille, notes, chrono, erreurs).
function applyState(game, body) {
  if (game.status !== 'en_cours') throw httpError(409, 'Cette partie est déjà terminée.');
  const board = parseBoard(body.board);
  for (let i = 0; i < 81; i++) {
    if (game.puzzle[i] !== '0' && board[i] !== game.puzzle[i]) {
      throw httpError(400, 'Les chiffres de départ ne peuvent pas être modifiés.');
    }
  }
  game.board = board;
  game.notes = JSON.stringify(parseNotes(body.notes));
  const elapsed = Math.floor(Number(body.elapsedSeconds));
  if (Number.isFinite(elapsed) && elapsed >= game.elapsed_seconds && elapsed < 10 * 24 * 3600) {
    game.elapsed_seconds = elapsed;
  }
  const errors = Math.floor(Number(body.errors));
  if (Number.isFinite(errors) && errors >= game.errors && errors < 100000) game.errors = errors;
}

function saveGame(game) {
  if (game.status === 'en_cours' && game.board === game.solution) {
    game.status = 'terminee';
    game.finished_at = new Date().toISOString();
  }
  db.prepare(
    `UPDATE games SET board = ?, notes = ?, elapsed_seconds = ?, errors = ?, hints_left = ?,
       status = ?, finished_at = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?`,
  ).run(
    game.board,
    game.notes,
    game.elapsed_seconds,
    game.errors,
    game.hints_left,
    game.status,
    game.finished_at,
    game.id,
  );
  return db.prepare('SELECT * FROM games WHERE id = ?').get(game.id);
}

// ---------------------------------------------------------------------------
// Authentification

const loginAttempts = new Map(); // ip -> { count, resetAt }

app.post('/api/login', (req, res) => {
  const key = req.ip;
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (entry && entry.resetAt > now && entry.count >= 10) {
    throw httpError(429, 'Trop de tentatives. Réessayez dans quelques minutes.');
  }
  const email = String(req.body?.email ?? '').trim();
  const password = String(req.body?.password ?? '');
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !user.active || !auth.verifyPassword(password, user.password_hash)) {
    const e = entry && entry.resetAt > now ? entry : { count: 0, resetAt: now + 15 * 60e3 };
    e.count++;
    loginAttempts.set(key, e);
    throw httpError(401, 'E-mail ou mot de passe incorrect.');
  }
  loginAttempts.delete(key);
  auth.setSessionCookie(req, res, user);
  res.json({ user: auth.publicUser(user) });
});

app.post('/api/logout', (_req, res) => {
  auth.clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  res.json({ user: req.user ? auth.publicUser(req.user) : null });
});

app.post('/api/me/password', auth.requireUser, (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!auth.verifyPassword(String(currentPassword ?? ''), req.user.password_hash)) {
    throw httpError(400, 'Mot de passe actuel incorrect.');
  }
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    throw httpError(400, 'Le nouveau mot de passe doit faire au moins 6 caractères.');
  }
  db.prepare('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?').run(
    auth.hashPassword(newPassword),
    req.user.id,
  );
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  auth.setSessionCookie(req, res, user);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Parties

app.get('/api/levels', (_req, res) => {
  res.json(Object.entries(sudoku.LEVELS).map(([id, l]) => ({ id, label: l.label })));
});

app.get('/api/games', auth.requireUser, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM games WHERE user_id = ? ORDER BY started_at DESC LIMIT 200')
    .all(req.user.id);
  res.json(rows.map(gameSummary));
});

app.post('/api/games', auth.requireUser, (req, res) => {
  const level = String(req.body?.level ?? '');
  if (!sudoku.LEVELS[level]) throw httpError(400, 'Niveau inconnu.');
  const { puzzle, solution } = sudoku.generate(level);
  const p = gridToString(puzzle);
  const info = db
    .prepare(
      `INSERT INTO games (user_id, level, puzzle, solution, board, notes, hints_left)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(req.user.id, level, p, gridToString(solution), p, JSON.stringify(new Array(81).fill(0)), MAX_HINTS);
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(gameDetail(game));
});

app.get('/api/games/:id', auth.requireUser, (req, res) => {
  res.json(gameDetail(findOwnGame(req)));
});

app.put('/api/games/:id', auth.requireUser, (req, res) => {
  const game = findOwnGame(req);
  applyState(game, req.body ?? {});
  res.json(gameDetail(saveGame(game)));
});

// Bonus : remplit une case vide (ou fausse) choisie au hasard.
app.post('/api/games/:id/hint', auth.requireUser, (req, res) => {
  const game = findOwnGame(req);
  applyState(game, req.body ?? {});
  if (game.hints_left <= 0) throw httpError(400, 'Plus aucun bonus disponible.');
  const candidates = [];
  for (let i = 0; i < 81; i++) if (game.board[i] !== game.solution[i]) candidates.push(i);
  if (!candidates.length) throw httpError(400, 'La grille est déjà complète.');
  const index = candidates[Math.floor(Math.random() * candidates.length)];
  const board = [...game.board];
  board[index] = game.solution[index];
  game.board = board.join('');
  const notes = JSON.parse(game.notes);
  notes[index] = 0;
  game.notes = JSON.stringify(notes);
  game.hints_left -= 1;
  res.json({ index, value: Number(game.solution[index]), game: gameDetail(saveGame(game)) });
});

app.post('/api/games/:id/abandon', auth.requireUser, (req, res) => {
  const game = findOwnGame(req);
  if (game.status !== 'en_cours') throw httpError(409, 'Cette partie est déjà terminée.');
  const elapsed = Math.floor(Number(req.body?.elapsedSeconds));
  if (Number.isFinite(elapsed) && elapsed >= game.elapsed_seconds) game.elapsed_seconds = elapsed;
  game.status = 'abandonnee';
  game.finished_at = new Date().toISOString();
  res.json(gameSummary(saveGame(game)));
});

// ---------------------------------------------------------------------------
// Administration

function validateUserInput({ email, name, password }, { partial = false } = {}) {
  if (!partial || email !== undefined) {
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw httpError(400, 'Adresse e-mail invalide.');
    }
  }
  if (!partial || name !== undefined) {
    if (typeof name !== 'string' || !name.trim() || name.length > 60) {
      throw httpError(400, 'Nom du joueur invalide.');
    }
  }
  if (!partial || password !== undefined) {
    if (typeof password !== 'string' || password.length < 6) {
      throw httpError(400, 'Le mot de passe doit faire au moins 6 caractères.');
    }
  }
}

function adminUserView(u) {
  return {
    ...auth.publicUser(u),
    active: !!u.active,
    createdAt: u.created_at,
    gamesPlayed: u.games_played ?? 0,
    gamesWon: u.games_won ?? 0,
  };
}

app.get('/api/admin/users', auth.requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT u.*,
         (SELECT COUNT(*) FROM games g WHERE g.user_id = u.id) AS games_played,
         (SELECT COUNT(*) FROM games g WHERE g.user_id = u.id AND g.status = 'terminee') AS games_won
       FROM users u ORDER BY u.name COLLATE NOCASE`,
    )
    .all();
  res.json(rows.map(adminUserView));
});

app.post('/api/admin/users', auth.requireAdmin, (req, res) => {
  const body = req.body ?? {};
  validateUserInput(body);
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(body.email.trim())) {
    throw httpError(409, 'Un joueur utilise déjà cette adresse e-mail.');
  }
  const user = auth.createUser({ ...body, isAdmin: !!body.isAdmin });
  res.status(201).json(adminUserView(user));
});

app.patch('/api/admin/users/:id', auth.requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) throw httpError(404, 'Joueur introuvable.');
  const body = req.body ?? {};
  validateUserInput(body, { partial: true });
  const isSelf = id === req.user.id;
  if (isSelf && (body.active === false || body.isAdmin === false)) {
    throw httpError(400, 'Vous ne pouvez pas retirer vos propres droits.');
  }
  if (body.email !== undefined) {
    const other = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(body.email.trim(), id);
    if (other) throw httpError(409, 'Un joueur utilise déjà cette adresse e-mail.');
    user.email = body.email.trim();
  }
  if (body.name !== undefined) user.name = body.name.trim();
  if (body.isAdmin !== undefined) user.is_admin = body.isAdmin ? 1 : 0;
  let revoke = false;
  if (body.active !== undefined) {
    revoke ||= !body.active;
    user.active = body.active ? 1 : 0;
  }
  if (body.password !== undefined) {
    user.password_hash = auth.hashPassword(body.password);
    revoke = true;
  }
  db.prepare(
    `UPDATE users SET email = ?, name = ?, is_admin = ?, active = ?, password_hash = ?,
       token_version = token_version + ? WHERE id = ?`,
  ).run(user.email, user.name, user.is_admin, user.active, user.password_hash, revoke ? 1 : 0, id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (isSelf && revoke) auth.setSessionCookie(req, res, updated);
  res.json(adminUserView(updated));
});

app.delete('/api/admin/users/:id', auth.requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) throw httpError(400, 'Vous ne pouvez pas supprimer votre propre compte.');
  const info = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  if (!info.changes) throw httpError(404, 'Joueur introuvable.');
  res.json({ ok: true });
});

app.get('/api/admin/games', auth.requireAdmin, (req, res) => {
  const where = [];
  const params = [];
  if (STATUSES.includes(req.query.status)) {
    where.push('g.status = ?');
    params.push(req.query.status);
  }
  if (req.query.userId) {
    where.push('g.user_id = ?');
    params.push(Number(req.query.userId));
  }
  const rows = db
    .prepare(
      `SELECT g.*, u.name AS player_name, u.email AS player_email
       FROM games g JOIN users u ON u.id = g.user_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY g.started_at DESC LIMIT 500`,
    )
    .all(...params);
  res.json(rows.map(gameSummary));
});

app.use('/api', (_req, _res, next) => next(httpError(404, 'Route inconnue.')));

// ---------------------------------------------------------------------------
// Fichiers statiques (PWA)

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
app.use(
  express.static(PUBLIC_DIR, {
    setHeaders(res, filePath) {
      if (/(sw\.js|\.html|\.webmanifest)$/.test(filePath)) res.set('Cache-Control', 'no-cache');
    },
  }),
);
app.get('/{*splat}', (_req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Erreur interne du serveur.' : err.message });
});

// ---------------------------------------------------------------------------
// Création automatique du compte administrateur au premier démarrage

function bootstrapAdmin() {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM users').get();
  if (count > 0) return;
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    auth.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: ADMIN_NAME || 'Admin',
      isAdmin: true,
    });
    console.log(`Compte administrateur créé : ${ADMIN_EMAIL}`);
  } else {
    console.warn(
      'Aucun utilisateur. Définissez ADMIN_EMAIL et ADMIN_PASSWORD, ou lancez :\n' +
        '  npm run create-user -- --admin <email> <motdepasse> "<Nom>"',
    );
  }
}

if (require.main === module) {
  bootstrapAdmin();
  app.listen(PORT, () => console.log(`Sudoku prêt sur http://localhost:${PORT}`));
}

module.exports = { app, bootstrapAdmin };
