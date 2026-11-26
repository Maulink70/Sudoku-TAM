// Outils communs aux fonctions serveur (Vercel) : accès administrateur à Firebase.
// La clé du compte de service est lue dans la variable d'environnement FIREBASE_SERVICE_ACCOUNT.
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// Compte administrateur principal (doit correspondre à src/config.js et firestore.rules).
export const SUPER_ADMIN_UID = '7ywYHqyVTNSvMPU3zAJ2ktMpjyi2';

/** Erreur renvoyée telle quelle à l'appli (message en français). */
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Lit la clé du compte de service (le fichier JSON téléchargé depuis la console Firebase).
 * Tolère les accidents de copier-coller : guillemets autour, retours à la ligne réels dans la
 * clé privée, contenu encodé en base64.
 */
export function parseServiceAccount(raw) {
  const text = raw
    .trim()
    .replace(/^(['"`])([\s\S]*)\1$/, '$2')
    .trim();
  // Les retours à la ligne réels à l'intérieur d'une chaîne JSON sont remis sous forme « \n ».
  const escapeInStrings = (t) => {
    let out = '';
    let inString = false;
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (inString && c === '\\') out += c + (t[++i] ?? '');
      else if (c === '"') ((inString = !inString), (out += c));
      else if (inString && c === '\n') out += '\\n';
      else if (inString && c === '\r') out += '';
      else out += c;
    }
    return out;
  };
  const candidates = [text, escapeInStrings(text)];
  if (/^[A-Za-z0-9+/=_\s-]+$/.test(text)) candidates.push(Buffer.from(text, 'base64').toString('utf8'));
  for (const candidate of candidates) {
    try {
      const account = JSON.parse(candidate);
      if (account?.private_key && account?.client_email && account?.project_id) return account;
    } catch {
      // essai suivant
    }
  }
  // Indices sans rien dévoiler de la clé, pour aider à corriger la variable.
  const hints = [
    `${text.length} caractères`,
    text.startsWith('{') ? 'commence bien par {' : 'ne commence pas par {',
    text.endsWith('}') ? 'finit bien par }' : 'ne finit pas par }',
    text.includes('private_key') ? 'contient private_key' : 'ne contient pas private_key',
  ].join(', ');
  throw new ApiError(
    503,
    `La clé du compte de service enregistrée dans Vercel est illisible (${hints}). Collez-y tout le contenu du fichier .json téléchargé.`,
  );
}

function adminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) return initializeApp({ credential: cert(parseServiceAccount(raw)) });
  // Développement local : les émulateurs n'ont pas besoin de clé.
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) return initializeApp({ projectId: 'sudoku-tam' });
  throw new ApiError(503, 'Fonction non configurée : la clé du compte de service manque dans Vercel.');
}

export const adminAuth = () => getAuth(adminApp());
export const adminDb = () => getFirestore(adminApp());
export const adminMessaging = () => getMessaging(adminApp());

/** Identifie l'appelant à partir de son jeton de connexion Firebase. */
async function caller(req) {
  const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1];
  if (!token) throw new ApiError(401, 'Connexion requise.');
  try {
    return await adminAuth().verifyIdToken(token);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, 'Session expirée. Reconnectez-vous.');
  }
}

/**
 * Enveloppe une fonction : méthode POST uniquement, appelant identifié, erreurs en JSON.
 * `run(user, body)` renvoie l'objet de réponse.
 */
export function endpoint(run) {
  return async (req, res) => {
    try {
      if (req.method !== 'POST') throw new ApiError(405, 'Méthode non autorisée.');
      const user = await caller(req);
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      res.status(200).json(await run(user, body));
    } catch (err) {
      if (!(err instanceof ApiError)) console.error(err);
      res
        .status(err instanceof ApiError ? err.status : 500)
        .json({ error: err instanceof ApiError ? err.message : 'Erreur du serveur. Réessayez.' });
    }
  };
}

export function requireSuperAdmin(user) {
  if (user.uid !== SUPER_ADMIN_UID) throw new ApiError(403, 'Réservé à l’administrateur principal.');
}
