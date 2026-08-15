/**
 * Bloque les doubles soumissions simultanées (même user + même body + même route).
 * À placer APRÈS verifierToken sur les routes POST de création.
 */
const { acquireLock, releaseLock, lockKeyFromReq } = require('../utils/antiDuplicate');

function antiDoubleSubmit(ttlMs = 4000) {
  return async function (req, res, next) {
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();
    const key = lockKeyFromReq(req);
    try {
      acquireLock(key, ttlMs);
    } catch (e) {
      return next(e);
    }
    const release = () => releaseLock(key);
    res.on('finish', release);
    res.on('close', release);
    next();
  };
}

module.exports = antiDoubleSubmit;
