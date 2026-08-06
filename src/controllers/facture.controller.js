const factureService = require('../services/facture.service');

async function listerFactures(req, res, next) {
  try {
    const result = await factureService.listerFactures(req.query.statut);
    res.json(result);
  } catch (erreur) {
    next(erreur);
  }
}

async function obtenirFacture(req, res, next) {
  try {
    const result = await factureService.obtenirFacture(req.params.id);
    if (!result) return res.status(404).json({ message: 'Facture introuvable' });
    res.json(result);
  } catch (erreur) {
    next(erreur);
  }
}

async function creerFactureDepuisVente(req, res, next) {
  try {
    const result = await factureService.creerFactureDepuisVente(req.body || {});
    res.status(201).json(result);
  } catch (erreur) {
    next(erreur);
  }
}

async function modifierStatutFacture(req, res, next) {
  try {
    const result = await factureService.modifierStatutFacture(req.params.id, req.body.statut);
    res.json(result);
  } catch (erreur) {
    next(erreur);
  }
}

async function resumeFactures(req, res, next) {
  try {
    const result = await factureService.resumeFactures();
    res.json(result);
  } catch (erreur) {
    next(erreur);
  }
}

async function genererPdfFacture(req, res, next) {
  try {
    const { cheminFichier, nomFichier } = await factureService.genererPdfFacture(req.params.id);
    res.download(cheminFichier, nomFichier);
  } catch (erreur) {
    next(erreur);
  }
}

module.exports = {
  listerFactures,
  obtenirFacture,
  creerFactureDepuisVente,
  modifierStatutFacture,
  resumeFactures,
  genererPdfFacture,
};