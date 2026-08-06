const venteService = require('../services/vente.service');

async function listerVentes(req, res, next) {
  try {
    const result = await venteService.listerVentes();
    res.json(result);
  } catch (erreur) {
    next(erreur);
  }
}

async function obtenirVente(req, res, next) {
  try {
    const result = await venteService.obtenirVente(req.params.id);
    res.json(result);
  } catch (erreur) {
    next(erreur);
  }
}

async function creerVente(req, res, next) {
  try {
    const result = await venteService.creerVente(req.body, req.utilisateur);
    res.status(201).json(result);
  } catch (erreur) {
    next(erreur);
  }
}

async function annulerVente(req, res, next) {
  try {
    const result = await venteService.annulerVente(req.params.id);
    res.json(result);
  } catch (erreur) {
    next(erreur);
  }
}

module.exports = { listerVentes, obtenirVente, creerVente, annulerVente };