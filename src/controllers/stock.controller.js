const stockService = require('../services/stock.service');

async function resumeStocks(req, res, next) {
  try {
    res.json(await stockService.resumeStocks());
  } catch (erreur) {
    next(erreur);
  }
}

async function listerMouvements(req, res, next) {
  try {
    res.json(
      await stockService.listerMouvements({
        page: req.query.page,
        limit: req.query.limit,
      })
    );
  } catch (erreur) {
    next(erreur);
  }
}

async function alertesStock(req, res, next) {
  try {
    res.json(await stockService.alertesStock());
  } catch (erreur) {
    next(erreur);
  }
}

async function analyseFlux(req, res, next) {
  try {
    res.json(await stockService.analyseFlux());
  } catch (erreur) {
    next(erreur);
  }
}

async function creerMouvement(req, res, next) {
  try {
    const body = { ...(req.body || {}) };
    const hk = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    if (hk && !body.idempotencyKey) body.idempotencyKey = String(hk);
    const result = await stockService.creerMouvement(body, req.utilisateur);
    res.status(result && result.replay ? 200 : 201).json(result);
  } catch (erreur) {
    next(erreur);
  }
}

module.exports = {
  resumeStocks,
  listerMouvements,
  alertesStock,
  analyseFlux,
  creerMouvement,
};
