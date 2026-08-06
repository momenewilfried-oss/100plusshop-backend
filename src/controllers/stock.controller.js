const stockService = require('../services/stock.service');

async function resumeStocks(req, res, next) {
  try {
    const result = await stockService.resumeStocks();
    res.json(result);
  } catch (erreur) {
    next(erreur);
  }
}

async function listerMouvements(req, res, next) {
  try {
    const page = req.query.page;
    const limit = req.query.limit;
    const result = await stockService.listerMouvements({ page, limit });
    res.json(result);
  } catch (erreur) {
    next(erreur);
  }
}

async function alertesStock(req, res, next) {
  try {
    const rows = await stockService.alertesStock();
    res.json(rows);
  } catch (erreur) {
    next(erreur);
  }
}

async function analyseFlux(req, res, next) {
  try {
    const rows = await stockService.analyseFlux();
    res.json(rows);
  } catch (erreur) {
    next(erreur);
  }
}

async function creerMouvement(req, res, next) {
  try {
    const result = await stockService.creerMouvement(req.body || {}, req.utilisateur);
    res.status(201).json(result);
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