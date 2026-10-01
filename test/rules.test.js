// Tests des règles de sécurité Firestore (à lancer avec : npm run test:rules).
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { generate } from '../src/sudoku.js';

const ADMIN_UID = '7ywYHqyVTNSvMPU3zAJ2ktMpjyi2';

let env;

const ctx = (uid, email) => env.authenticatedContext(uid, { email }).firestore();

const { puzzle, solution } = generate('facile');
const P = puzzle.join('');
const S = solution.join('');

function newGame(uid, extra = {}) {
  return {
    uid,
    playerName: 'Test',
    level: 'facile',
    status: 'en_cours',
    puzzle: P,
    solution: S,
    board: P,
    notes: new Array(81).fill(0),
    hints: [],
    hintsLeft: 10,
    errors: 0,
    elapsedSeconds: 0,
    startedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    finishedAt: null,
    ...extra,
  };
}

test.before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-sudoku',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

test.after(() => env.cleanup());

test('règles Firestore', async (t) => {
  await env.clearFirestore();
  const admin = ctx(ADMIN_UID, 'admin@test.fr');
  const alice = ctx('alice', 'alice@test.fr');
  const bob = ctx('bob', 'bob@test.fr');
  const intrus = ctx('intrus', 'intrus@test.fr');

  await t.test('seul l’admin crée les fiches joueurs', async () => {
    await assertSucceeds(
      setDoc(doc(admin, 'players/admin@test.fr'), { name: 'Admin', isAdmin: true, active: true }),
    );
    await assertSucceeds(
      setDoc(doc(admin, 'players/alice@test.fr'), { name: 'Alice', isAdmin: false, active: true }),
    );
    await assertSucceeds(
      setDoc(doc(admin, 'players/bob@test.fr'), { name: 'Bob', isAdmin: false, active: true }),
    );
    await assertFails(
      setDoc(doc(intrus, 'players/intrus@test.fr'), { name: 'X', isAdmin: true, active: true }),
    );
    await assertFails(
      setDoc(doc(alice, 'players/zoe@test.fr'), { name: 'Zoé', isAdmin: false, active: true }),
    );
  });

  await t.test('un joueur lit sa fiche et ne peut que l’horodater', async () => {
    await assertSucceeds(getDoc(doc(alice, 'players/alice@test.fr')));
    await assertFails(getDoc(doc(alice, 'players/bob@test.fr')));
    await assertSucceeds(
      updateDoc(doc(alice, 'players/alice@test.fr'), { uid: 'alice', lastLoginAt: serverTimestamp() }),
    );
    await assertFails(updateDoc(doc(alice, 'players/alice@test.fr'), { isAdmin: true }));
    await assertFails(updateDoc(doc(alice, 'players/alice@test.fr'), { uid: 'bob' }));
  });

  await t.test('création de partie', async () => {
    await assertSucceeds(setDoc(doc(alice, 'games/a1'), newGame('alice')));
    await assertFails(setDoc(doc(intrus, 'games/x1'), newGame('intrus')));
    await assertFails(setDoc(doc(alice, 'games/a2'), newGame('bob')));
    await assertFails(setDoc(doc(alice, 'games/a3'), newGame('alice', { hintsLeft: 99 })));
    await assertFails(setDoc(doc(alice, 'games/a4'), newGame('alice', { status: 'terminee' })));
  });

  await t.test('sauvegarde, bonus et victoire', async () => {
    const ref = doc(alice, 'games/a1');
    await assertSucceeds(updateDoc(ref, { board: P, elapsedSeconds: 30, hintsLeft: 9, hints: [3] }));
    await assertFails(updateDoc(ref, { hintsLeft: 10 }));
    await assertFails(updateDoc(ref, { elapsedSeconds: 5 }));
    await assertFails(updateDoc(ref, { solution: P }));
    await assertFails(updateDoc(ref, { status: 'terminee' }));
    await assertFails(updateDoc(doc(bob, 'games/a1'), { elapsedSeconds: 60 }));
    await assertSucceeds(updateDoc(ref, { board: S, status: 'terminee', finishedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref, { elapsedSeconds: 999 }));
  });

  await t.test('lecture : ses parties, classement, admin', async () => {
    await assertSucceeds(setDoc(doc(bob, 'games/b1'), newGame('bob')));
    await assertSucceeds(getDocs(query(collection(alice, 'games'), where('uid', '==', 'alice'))));
    await assertFails(getDoc(doc(alice, 'games/b1')));
    await assertSucceeds(
      getDocs(
        query(collection(bob, 'games'), where('status', '==', 'terminee'), where('level', '==', 'facile')),
      ),
    );
    await assertFails(getDocs(collection(alice, 'games')));
    await assertFails(getDocs(query(collection(intrus, 'games'), where('status', '==', 'terminee'))));
    await assertSucceeds(getDocs(collection(admin, 'games')));
    await assertSucceeds(getDocs(collection(admin, 'players')));
  });

  await t.test('suppression de parties', async () => {
    await assertSucceeds(setDoc(doc(alice, 'games/a9'), newGame('alice')));
    await assertFails(deleteDoc(doc(bob, 'games/a9')));
    await assertSucceeds(deleteDoc(doc(alice, 'games/a9')));
    await assertSucceeds(deleteDoc(doc(admin, 'games/b1')));
    await assertSucceeds(setDoc(doc(bob, 'games/b1'), newGame('bob')));
  });

  await t.test('joueur désactivé bloqué', async () => {
    await assertSucceeds(updateDoc(doc(admin, 'players/bob@test.fr'), { active: false }));
    await assertFails(updateDoc(doc(bob, 'games/b1'), { elapsedSeconds: 10 }));
    await assertFails(setDoc(doc(bob, 'games/b2'), newGame('bob')));
  });
});
