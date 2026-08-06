const produitService = require('../services/produit.service');

async function listerProduits(req, res, next) {
  try { res.json(await produitService.listerProduits()); } catch (e) { next(e); }
}
async function obtenirProduit(req, res, next) {
  try { res.json(await produitService.obtenirProduit(req.params.id)); } catch (e) { next(e); }
}
async function creerProduit(req, res, next) {
  try {
    const r = await produitService.creerProduit(req.body, req.utilisateur);
    res.status(201).json(r);
  } catch (e) { next(e); }
}
async function modifierProduit(req, res, next) {
  try {
    res.json(await produitService.modifierProduit(req.params.id, req.body, req.utilisateur));
  } catch (e) { next(e); }
}
async function supprimerProduit(req, res, next) {
  try {
    res.json(await produitService.supprimerProduit(req.params.id, req.utilisateur));
  } catch (e) { next(e); }
}
async function produitsStockFaible(req, res, next) {
  try { res.json(await produitService.produitsStockFaible()); } catch (e) { next(e); }
}
async function creerVariante(req, res, next) {
  try {
    const r = await produitService.creerVariante(req.params.id, req.body, req.utilisateur);
    res.status(201).json(r);
  } catch (e) { next(e); }
}

module.exports = {
  listerProduits, obtenirProduit, creerProduit, modifierProduit,
  supprimerProduit, produitsStockFaible, creerVariante,
};