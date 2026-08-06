const clientService = require('../services/client.service');

async function listerClients(req, res, next) {
  try {
    res.json(await clientService.listerClients());
  } catch (e) {
    next(e);
  }
}

async function obtenirClient(req, res, next) {
  try {
    res.json(await clientService.obtenirClient(req.params.id));
  } catch (e) {
    next(e);
  }
}

async function creerClient(req, res, next) {
  try {
    const result = await clientService.creerClient(req.body, req.utilisateur);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
}

async function modifierClient(req, res, next) {
  try {
    res.json(await clientService.modifierClient(req.params.id, req.body, req.utilisateur));
  } catch (e) {
    next(e);
  }
}

async function supprimerClient(req, res, next) {
  try {
    res.json(await clientService.supprimerClient(req.params.id, req.utilisateur));
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listerClients,
  obtenirClient,
  creerClient,
  modifierClient,
  supprimerClient,
};