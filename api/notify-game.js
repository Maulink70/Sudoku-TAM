// Prévient l'administrateur principal (notification sur ses appareils) qu'un joueur vient de
// lancer une partie. Appelée par l'appli du joueur juste après la création de la partie.
import { FieldValue } from 'firebase-admin/firestore';
import { ApiError, SUPER_ADMIN_UID, adminDb, adminMessaging, endpoint } from './_lib.js';

const LEVEL_LABELS = {
  debutant: 'Débutant',
  tres_facile: 'Très facile',
  facile: 'Facile',
  moyen: 'Moyen',
  difficile: 'Difficile',
  extreme: 'Extrême',
};

const sendPush = (message) => adminMessaging().sendEachForMulticast(message);

/** `send` est remplaçable dans les tests. */
export function notifyGame(send = sendPush) {
  return async (user, { gameId }) => {
    if (user.uid === SUPER_ADMIN_UID) return { sent: 0 };
    if (typeof gameId !== 'string' || !/^[\w-]{1,64}$/.test(gameId))
      throw new ApiError(400, 'Partie inconnue.');
    const db = adminDb();
    const snap = await db.doc(`games/${gameId}`).get();
    const game = snap.data();
    if (!game || game.uid !== user.uid) throw new ApiError(404, 'Partie inconnue.');
    // Seulement pour une partie qui vient d'être créée, et une seule fois par partie.
    const startedAt = game.startedAt?.toMillis?.() || 0;
    if (game.status !== 'en_cours' || Date.now() - startedAt > 10 * 60 * 1000) return { sent: 0 };
    try {
      await db.doc(`notified/${gameId}`).create({ at: FieldValue.serverTimestamp() });
    } catch {
      return { sent: 0 };
    }

    const pushRef = db.doc(`push/${SUPER_ADMIN_UID}`);
    const tokens = (await pushRef.get()).data()?.tokens || [];
    if (!tokens.length) return { sent: 0 };
    const name = String(game.playerName || 'Un joueur').slice(0, 40);
    const result = await send({
      tokens,
      data: {
        title: 'SudoTam',
        body: `${name} a lancé une partie ${LEVEL_LABELS[game.level] || ''}`.trim(),
        url: '/',
      },
      webpush: { headers: { Urgency: 'high', TTL: '3600' } },
    });
    // Oublie les appareils dont le jeton n'est plus valable (appli désinstallée, etc.).
    const dead = tokens.filter((_, i) =>
      ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(
        result.responses[i]?.error?.code,
      ),
    );
    if (dead.length) await pushRef.update({ tokens: FieldValue.arrayRemove(...dead) });
    return { sent: result.successCount };
  };
}

export default endpoint(notifyGame());
