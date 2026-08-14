const marqueService = require('../services/marque.service');

async function listerMarques(req, res, next) {
  try {
    res.json(await marqueService.listMarques());
  } catch (e) {
    next(e);
  }
}

async function creerMarque(req, res, next) {
  try {
    const row = await marqueService.createMarque(req.body || {}, req.utilisateur);
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

module.exports = { listerMarques, creerMarque };
