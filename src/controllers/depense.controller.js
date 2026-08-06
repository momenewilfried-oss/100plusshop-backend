const depenseService = require('../services/depense.service');

async function listerDepenses(req, res, next) {
  try {
    res.json(await depenseService.listerDepenses(req.query || {}));
  } catch (e) {
    next(e);
  }
}

async function creerDepense(req, res, next) {
  try {
    const result = await depenseService.creerDepense(req.body || {}, req.utilisateur);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
}

async function modifierDepense(req, res, next) {
  try {
    res.json(
      await depenseService.modifierDepense(req.params.id, req.body || {}, req.utilisateur)
    );
  } catch (e) {
    next(e);
  }
}

async function supprimerDepense(req, res, next) {
  try {
    res.json(await depenseService.supprimerDepense(req.params.id, req.utilisateur));
  } catch (e) {
    next(e);
  }
}

module.exports = { listerDepenses, creerDepense, modifierDepense, supprimerDepense };