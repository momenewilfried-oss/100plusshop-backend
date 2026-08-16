const achatService = require('../services/achat.service');

async function listerAchats(req, res, next) {
  try {
    const rows = await achatService.listAchats();
    res.json(rows);
  } catch (erreur) {
    next(erreur);
  }
}

async function obtenirAchat(req, res, next) {
  try {
    const result = await achatService.getAchat(req.params.id);
    if (!result) return res.status(404).json({ message: 'Achat introuvable' });
    res.json(result);
  } catch (erreur) {
    next(erreur);
  }
}

async function creerAchat(req, res, next) {
  try {
    const body = { ...(req.body || {}) };
    const hk = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    if (hk && !body.idempotencyKey) body.idempotencyKey = String(hk);
    const result = await achatService.createAchat(body || {}, req.utilisateur);
    res.status(result && result.replay ? 200 : 201).json(result);
  } catch (erreur) {
    next(erreur);
  }
}

module.exports = { listerAchats, obtenirAchat, creerAchat };
