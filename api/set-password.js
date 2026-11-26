// L'administrateur principal définit le nouveau mot de passe d'un joueur.
import { ApiError, adminAuth, endpoint, requireSuperAdmin } from './_lib.js';

export default endpoint(async (user, { email, password }) => {
  requireSuperAdmin(user);
  const mail = String(email || '')
    .trim()
    .toLowerCase();
  if (!mail) throw new ApiError(400, 'Joueur inconnu.');
  if (typeof password !== 'string' || password.length < 6) {
    throw new ApiError(400, 'Le mot de passe doit faire au moins 6 caractères.');
  }
  let target;
  try {
    target = await adminAuth().getUserByEmail(mail);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      throw new ApiError(404, 'Ce joueur n’a pas encore de compte de connexion.');
    }
    throw err;
  }
  await adminAuth().updateUser(target.uid, { password });
  // Déconnecte le joueur de ses appareils : il se reconnecte avec le nouveau mot de passe.
  if (target.uid !== user.uid) await adminAuth().revokeRefreshTokens(target.uid);
  return { ok: true };
});
