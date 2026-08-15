/**
 * Anti-doublons métier + verrou court anti double-clic / double requête.
 */
const { ApiError } = require('./error-handler');

/** Verrous mémoire : clé → expireAt (ms) */
const locks = new Map();

/**
 * Empêche deux requêtes identiques quasi simultanées (même user + même action).
 * @param {string} key
 * @param {number} ttlMs durée du verrou (défaut 4s)
 */
function acquireLock(key, ttlMs = 4000) {
  const now = Date.now();
  // nettoie un peu
  if (locks.size > 5000) {
    for (const [k, exp] of locks) {
      if (exp <= now) locks.delete(k);
    }
  }
  const exp = locks.get(key);
  if (exp && exp > now) {
    throw new ApiError(
      409,
      'Action déjà en cours ou tout juste enregistrée. Attendez une seconde puis réessayez.'
    );
  }
  locks.set(key, now + ttlMs);
}

function releaseLock(key) {
  locks.delete(key);
}

function lockKeyFromReq(req, suffix = '') {
  const uid = req.utilisateur?.id || req.utilisateur?.id_utilisateur || 'anon';
  const path = req.originalUrl || req.path || '';
  const body = req.body ? JSON.stringify(req.body) : '';
  // hash simple
  let h = 0;
  const s = `${uid}|${path}|${body}|${suffix}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `lock:${h}`;
}

module.exports = {
  acquireLock,
  releaseLock,
  lockKeyFromReq,
};
