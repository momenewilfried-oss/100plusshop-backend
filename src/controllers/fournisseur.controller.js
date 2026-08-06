const fournisseurService = require('../services/fournisseur.service');

async function listerFournisseurs(req, res, next) {
  try {
    res.json(await fournisseurService.listFournisseurs());
  } catch (e) {
    next(e);
  }
}

async function obtenirFournisseur(req, res, next) {
  try {
    res.json(await fournisseurService.getFournisseurById(req.params.id));
  } catch (e) {
    next(e);
  }
}

async function creerFournisseur(req, res, next) {
  try {
    const row = await fournisseurService.createFournisseur(req.body || {}, req.utilisateur);
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

async function modifierFournisseur(req, res, next) {
  try {
    res.json(
      await fournisseurService.updateFournisseur(req.params.id, req.body || {}, req.utilisateur)
    );
  } catch (e) {
    next(e);
  }
}

async function supprimerFournisseur(req, res, next) {
  try {
    res.json(await fournisseurService.deleteFournisseur(req.params.id, req.utilisateur));
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listerFournisseurs,
  obtenirFournisseur,
  creerFournisseur,
  modifierFournisseur,
  supprimerFournisseur,
};