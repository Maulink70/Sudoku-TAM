'use strict';

const crypto = require('node:crypto');
const { db, getSetting, setSetting } = require('./db');

const COOKIE_NAME = 'sudoku_session';
const SESSION_DAYS = 30;

// Secret de signature des sessions : variable d'environnement, sinon généré
// une fois et conservé en base pour que les sessions survivent aux redémarrages.
let secret = process.env.SESSION_SECRET;
if (!secret) {
  secret = getSetting('session_secret');
  if (!secret) {
    secret = crypto.randomBytes(32).toString('hex');
    setSetting('session_secret', secret);
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [algo, saltHex, hashHex] = String(stored).split('$');
  if (algo !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

function sign(data) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

function createToken(user) {
  const payload = Buffer.from(
    JSON.stringify({ uid: user.id, v: user.token_version, exp: Date.now() + SESSION_DAYS * 864e5 }),
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function readToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function setSessionCookie(req, res, user) {
  res.cookie(COOKIE_NAME, createToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    maxAge: SESSION_DAYS * 864e5,
    path: '/',
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, isAdmin: !!u.is_admin };
}

// Middleware : charge l'utilisateur connecté dans req.user (ou null).
function loadUser(req, _res, next) {
  req.user = null;
  const data = readToken(parseCookies(req.headers.cookie)[COOKIE_NAME]);
  if (data) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(data.uid);
    if (user && user.active && user.token_version === data.v) req.user = user;
  }
  next();
}

function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Veuillez vous connecter.' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Veuillez vous connecter.' });
  if (!req.user.is_admin) return res.status(403).json({ error: 'Accès réservé à l’administrateur.' });
  next();
}

function createUser({ email, name, password, isAdmin = false }) {
  const info = db
    .prepare('INSERT INTO users (email, name, password_hash, is_admin) VALUES (?, ?, ?, ?)')
    .run(email.trim(), name.trim(), hashPassword(password), isAdmin ? 1 : 0);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
}

module.exports = {
  hashPassword,
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
  publicUser,
  loadUser,
  requireUser,
  requireAdmin,
  createUser,
};
