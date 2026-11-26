// Active ou désactive les notifications sur un appareil de l'administrateur principal.
// Les jetons des appareils sont rangés dans Firestore (push/{uid}), hors de portée de l'appli.
import { FieldValue } from 'firebase-admin/firestore';
import { ApiError, adminDb, endpoint, requireSuperAdmin } from './_lib.js';

export default endpoint(async (user, { token, enable }) => {
  requireSuperAdmin(user);
  if (typeof token !== 'string' || token.length < 20 || token.length > 4096) {
    throw new ApiError(400, 'Jeton de notification invalide.');
  }
  await adminDb()
    .doc(`push/${user.uid}`)
    .set({ tokens: enable ? FieldValue.arrayUnion(token) : FieldValue.arrayRemove(token) }, { merge: true });
  return { ok: true };
});
