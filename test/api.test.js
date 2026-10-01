'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sudoku-test-'));
process.env.DB_PATH = path.join(tmp, 'test.db');
process.env.ADMIN_EMAIL = 'admin@test.fr';
process.env.ADMIN_PASSWORD = 'admin123';
process.env.ADMIN_NAME = 'Admin';

const { app, bootstrapAdmin } = require('../server/index');

let server;
let base;

test.before(async () => {
  bootstrapAdmin();
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

function client() {
  let cookie = '';
  return async (method, url, body) => {
    const res = await fetch(base + url, {
      method,
      headers: { 'Content-Type': 'application/json', cookie },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, data: await res.json().catch(() => null) };
  };
}

test('parcours complet : comptes, partie, bonus, victoire, admin', async () => {
  const admin = client();
  const player = client();

  assert.equal((await player('GET', '/api/games')).status, 401);
  assert.equal((await admin('POST', '/api/login', { email: 'admin@test.fr', password: 'faux' })).status, 401);
  assert.equal(
    (await admin('POST', '/api/login', { email: 'admin@test.fr', password: 'admin123' })).status,
    200,
  );

  // L'admin crée un joueur ; un joueur ne peut pas accéder à l'admin.
  const created = await admin('POST', '/api/admin/users', {
    name: 'Marie',
    email: 'marie@test.fr',
    password: 'secret1',
  });
  assert.equal(created.status, 201);
  assert.equal(
    (await admin('POST', '/api/admin/users', { name: 'X', email: 'marie@test.fr', password: 'secret1' }))
      .status,
    409,
  );

  const login = await player('POST', '/api/login', { email: 'MARIE@test.fr', password: 'secret1' });
  assert.equal(login.status, 200);
  assert.equal(login.data.user.name, 'Marie');
  assert.equal((await player('GET', '/api/admin/users')).status, 403);

  // Nouvelle partie
  const { status, data: game } = await player('POST', '/api/games', { level: 'facile' });
  assert.equal(status, 201);
  assert.equal(game.status, 'en_cours');
  assert.equal(game.hintsLeft, 10);
  assert.equal(game.board.length, 81);

  // Les chiffres de départ ne peuvent pas être modifiés.
  const given = game.puzzle.findIndex((v) => v !== 0);
  const tampered = game.board.slice();
  tampered[given] = (tampered[given] % 9) + 1;
  assert.equal((await player('PUT', `/api/games/${game.id}`, { board: tampered })).status, 400);

  // Sauvegarde d'une partie en cours.
  const empty = game.puzzle.findIndex((v) => v === 0);
  const board = game.board.slice();
  board[empty] = game.solution[empty];
  const saved = await player('PUT', `/api/games/${game.id}`, { board, elapsedSeconds: 42, errors: 1 });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.elapsedSeconds, 42);
  assert.equal(saved.data.board[empty], game.solution[empty]);

  // Bonus : remplit une case et décrémente le compteur.
  const hint = await player('POST', `/api/games/${game.id}/hint`, { board, elapsedSeconds: 50, errors: 1 });
  assert.equal(hint.status, 200);
  assert.equal(hint.data.game.hintsLeft, 9);
  assert.equal(hint.data.value, game.solution[hint.data.index]);
  assert.equal(game.puzzle[hint.data.index], 0);

  // Grille complète → partie terminée.
  const done = await player('PUT', `/api/games/${game.id}`, { board: game.solution, elapsedSeconds: 300 });
  assert.equal(done.data.status, 'terminee');
  assert.ok(done.data.finishedAt);
  assert.equal((await player('PUT', `/api/games/${game.id}`, { board: game.solution })).status, 409);

  // Abandon d'une autre partie.
  const g2 = (await player('POST', '/api/games', { level: 'extreme' })).data;
  const ab = await player('POST', `/api/games/${g2.id}/abandon`, { elapsedSeconds: 12 });
  assert.equal(ab.data.status, 'abandonnee');

  // Un autre joueur ne voit pas ces parties.
  assert.equal((await admin('GET', `/api/games/${g2.id}`)).status, 404);

  // Vue admin des parties, avec nom du joueur.
  const all = await admin('GET', '/api/admin/games');
  assert.equal(all.data.length, 2);
  assert.deepEqual(
    all.data.map((g) => g.playerName),
    ['Marie', 'Marie'],
  );
  const finished = await admin('GET', '/api/admin/games?status=terminee');
  assert.equal(finished.data.length, 1);
  assert.equal(finished.data[0].elapsedSeconds, 300);

  // Changement de mot de passe par l'admin → la session du joueur est révoquée.
  await admin('PATCH', `/api/admin/users/${created.data.id}`, { password: 'nouveau1' });
  assert.equal((await player('GET', '/api/games')).status, 401);
  assert.equal(
    (await player('POST', '/api/login', { email: 'marie@test.fr', password: 'nouveau1' })).status,
    200,
  );

  // Compte désactivé → connexion refusée.
  await admin('PATCH', `/api/admin/users/${created.data.id}`, { active: false });
  assert.equal(
    (await player('POST', '/api/login', { email: 'marie@test.fr', password: 'nouveau1' })).status,
    401,
  );
});
