const utilisateurService = require('../services/utilisateur.service');

async function listerUtilisateurs(req, res, next) {
  try {
    res.json(await utilisateurService.listerUtilisateurs());
  } catch (e) {
    next(e);
  }
}

async function obtenirUtilisateur(req, res, next) {
  try {
    res.json(await utilisateurService.obtenirUtilisateur(req.params.id));
  } catch (e) {
    next(e);
  }
}

async function creerUtilisateur(req, res, next) {
  try {
    const result = await utilisateurService.creerUtilisateur(req.body, req.utilisateur);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
}

async function modifierUtilisateur(req, res, next) {
  try {
    res.json(await utilisateurService.modifierUtilisateur(req.params.id, req.body, req.utilisateur));
  } catch (e) {
    next(e);
  }
}

async function supprimerUtilisateur(req, res, next) {
  try {
    res.json(
      await utilisateurService.supprimerUtilisateur(
        req.params.id,
        req.utilisateur.id,
        req.utilisateur
      )
    );
  } catch (e) {
    next(e);
  }
}

async function listerRoles(req, res, next) {
  try {
    res.json(await utilisateurService.listerRoles());
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listerUtilisateurs,
  obtenirUtilisateur,
  creerUtilisateur,
  modifierUtilisateur,
  supprimerUtilisateur,
  listerRoles,
};