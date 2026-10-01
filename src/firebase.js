// Accès à Firebase : authentification et données Firestore.
import { initializeApp, deleteApp } from 'firebase/app';
import {
  initializeAuth,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  inMemoryPersistence,
  connectAuthEmulator,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { firebaseConfig, USE_EMULATORS, SUPER_ADMIN_UID, MAX_HINTS } from './config.js';

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
auth.languageCode = 'fr';

// Cache local persistant : les sauvegardes faites hors ligne sont envoyées au retour du réseau.
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

if (USE_EMULATORS) {
  connectAuthEmulator(auth, `http://${location.hostname}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, location.hostname, 8080);
}

const normEmail = (email) =>
  String(email || '')
    .trim()
    .toLowerCase();

const toDate = (ts) => (ts && typeof ts.toDate === 'function' ? ts.toDate() : ts || null);

// ------------------------------------------------------------------ comptes

export const isSuperAdmin = (user) => user?.uid === SUPER_ADMIN_UID;

export function onUserChanged(cb) {
  return onAuthStateChanged(auth, cb);
}

export function login(email, password) {
  return signInWithEmailAndPassword(auth, normEmail(email), password);
}

export function logout() {
  return signOut(auth);
}

export async function changeMyPassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  await updatePassword(user, newPassword);
}

export function sendReset(email) {
  return sendPasswordResetEmail(auth, normEmail(email));
}

function playerFromSnap(snap) {
  const d = snap.data({ serverTimestamps: 'estimate' });
  return {
    email: snap.id,
    name: d.name,
    isAdmin: !!d.isAdmin,
    active: d.active !== false,
    uid: d.uid || null,
    createdAt: toDate(d.createdAt),
    lastLoginAt: toDate(d.lastLoginAt),
  };
}

export async function getMyPlayer(user) {
  const snap = await getDoc(doc(db, 'players', normEmail(user.email)));
  return snap.exists() ? playerFromSnap(snap) : null;
}

// Enregistre l'UID et la date de connexion sur la fiche du joueur.
export function touchPlayer(user) {
  return updateDoc(doc(db, 'players', normEmail(user.email)), {
    uid: user.uid,
    lastLoginAt: serverTimestamp(),
  });
}

// Premier démarrage : l'administrateur principal crée sa propre fiche.
export async function createSuperAdminPlayer(user, name) {
  await setDoc(doc(db, 'players', normEmail(user.email)), {
    name: name.trim(),
    isAdmin: true,
    active: true,
    uid: user.uid,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  });
}

// ------------------------------------------------------------------ admin

export async function listPlayers() {
  const snap = await getDocs(collection(db, 'players'));
  return snap.docs.map(playerFromSnap).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

/**
 * Crée le compte de connexion (via une instance Firebase secondaire, pour ne pas
 * déconnecter l'administrateur) puis la fiche joueur.
 * Renvoie { existed: true } si le compte de connexion existait déjà.
 */
export async function createPlayer({ name, email, password, isAdmin }) {
  email = normEmail(email);
  const ref = doc(db, 'players', email);
  if ((await getDoc(ref)).exists()) {
    const err = new Error('Un joueur utilise déjà cette adresse e-mail.');
    err.code = 'player-exists';
    throw err;
  }
  const secondary = initializeApp(firebaseConfig, `admin-${Date.now()}`);
  let existed = false;
  try {
    const secAuth = initializeAuth(secondary, { persistence: inMemoryPersistence });
    if (USE_EMULATORS)
      connectAuthEmulator(secAuth, `http://${location.hostname}:9099`, { disableWarnings: true });
    try {
      await createUserWithEmailAndPassword(secAuth, email, password);
    } catch (err) {
      if (err.code !== 'auth/email-already-in-use') throw err;
      existed = true;
    }
    await signOut(secAuth).catch(() => {});
  } finally {
    await deleteApp(secondary).catch(() => {});
  }
  await setDoc(ref, { name: name.trim(), isAdmin: !!isAdmin, active: true, createdAt: serverTimestamp() });
  return { existed };
}

export function updatePlayer(email, fields) {
  return updateDoc(doc(db, 'players', normEmail(email)), fields);
}

export function deletePlayer(email) {
  return deleteDoc(doc(db, 'players', normEmail(email)));
}

// ------------------------------------------------------------------ parties

function gameFromSnap(snap) {
  const d = snap.data({ serverTimestamps: 'estimate' });
  return {
    id: snap.id,
    uid: d.uid,
    playerName: d.playerName,
    level: d.level,
    status: d.status,
    puzzle: [...d.puzzle].map(Number),
    solution: [...d.solution].map(Number),
    board: [...d.board].map(Number),
    notes: Array.isArray(d.notes) && d.notes.length === 81 ? d.notes.slice() : new Array(81).fill(0),
    hints: Array.isArray(d.hints) ? d.hints.slice() : [],
    hintsLeft: d.hintsLeft ?? MAX_HINTS,
    errors: d.errors || 0,
    elapsedSeconds: d.elapsedSeconds || 0,
    startedAt: toDate(d.startedAt),
    updatedAt: toDate(d.updatedAt),
    finishedAt: toDate(d.finishedAt),
  };
}

export async function createGame(user, playerName, level, puzzle, solution) {
  const ref = doc(collection(db, 'games'));
  const p = puzzle.join('');
  await setDoc(ref, {
    uid: user.uid,
    playerName,
    level,
    status: 'en_cours',
    puzzle: p,
    solution: solution.join(''),
    board: p,
    notes: new Array(81).fill(0),
    hints: [],
    hintsLeft: MAX_HINTS,
    errors: 0,
    elapsedSeconds: 0,
    startedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    finishedAt: null,
  });
  return gameFromSnap(await getDoc(ref));
}

export async function getGame(id) {
  const snap = await getDoc(doc(db, 'games', id));
  return snap.exists() ? gameFromSnap(snap) : null;
}

/** Enregistre l'état d'une partie. `extra` permet de changer le statut. */
export function saveGame(game, extra = {}) {
  return updateDoc(doc(db, 'games', game.id), {
    board: game.board.join(''),
    notes: game.notes,
    hints: game.hints,
    hintsLeft: game.hintsLeft,
    errors: game.errors,
    elapsedSeconds: game.elapsedSeconds,
    updatedAt: serverTimestamp(),
    ...extra,
  });
}

export function deleteGame(id) {
  return deleteDoc(doc(db, 'games', id));
}

export function finishGame(game, status) {
  return saveGame(game, { status, finishedAt: serverTimestamp() });
}

const byStartDesc = (a, b) => (b.startedAt?.getTime() || 0) - (a.startedAt?.getTime() || 0);

export async function listMyGames(uid) {
  const snap = await getDocs(query(collection(db, 'games'), where('uid', '==', uid)));
  return snap.docs.map(gameFromSnap).sort(byStartDesc);
}

export async function listAllGames() {
  const snap = await getDocs(query(collection(db, 'games'), orderBy('startedAt', 'desc'), limit(1000)));
  return snap.docs.map(gameFromSnap);
}

// Classement : meilleur temps de chaque joueur pour un niveau.
export async function leaderboard(level) {
  const snap = await getDocs(
    query(collection(db, 'games'), where('status', '==', 'terminee'), where('level', '==', level)),
  );
  const best = new Map();
  for (const g of snap.docs.map(gameFromSnap)) {
    const cur = best.get(g.uid);
    if (!cur || g.elapsedSeconds < cur.elapsedSeconds) best.set(g.uid, g);
  }
  return [...best.values()].sort((a, b) => a.elapsedSeconds - b.elapsedSeconds);
}

export function errorMessage(err) {
  const map = {
    'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
    'auth/wrong-password': 'E-mail ou mot de passe incorrect.',
    'auth/user-not-found': 'E-mail ou mot de passe incorrect.',
    'auth/invalid-email': 'Adresse e-mail invalide.',
    'auth/user-disabled': 'Ce compte est désactivé.',
    'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
    'auth/weak-password': 'Le mot de passe doit faire au moins 6 caractères.',
    'auth/network-request-failed': 'Connexion impossible. Vérifiez votre réseau.',
    'auth/requires-recent-login': 'Reconnectez-vous puis réessayez.',
    'auth/admin-restricted-operation':
      'La création de comptes est désactivée dans Firebase (Authentication → Paramètres → Actions des utilisateurs).',
    'auth/operation-not-allowed': 'La connexion par e-mail/mot de passe n’est pas activée dans Firebase.',
    'auth/quota-exceeded': 'Trop de comptes créés récemment. Réessayez plus tard.',
    'permission-denied': 'Accès refusé (vérifiez que les règles Firestore sont à jour).',
    unavailable: 'Serveur injoignable. Vérifiez votre réseau.',
  };
  if (map[err?.code]) return map[err.code];
  if (err?.code === 'player-exists') return err.message;
  if (err?.code) return `Une erreur est survenue (${err.code}).`;
  return err?.message || 'Une erreur est survenue.';
}
