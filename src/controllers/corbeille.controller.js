const corbeilleService = require('../services/corbeille.service');

async function lister(req, res, next) {
  try { res.json(await corbeilleService.listerCorbeille()); } catch (e) { next(e); }
}
async function restaurerUtilisateur(req, res, next) {
  try {
    res.json(await corbeilleService.restaurerUtilisateur(req.params.id, req.utilisateur));
  } catch (e) { next(e); }
}
async function restaurerClient(req, res, next) {
  try {
    res.json(await corbeilleService.restaurerClient(req.params.id, req.utilisateur));
  } catch (e) { next(e); }
}
async function restaurerProduit(req, res, next) {
  try {
    res.json(await corbeilleService.restaurerProduit(req.params.id, req.utilisateur));
  } catch (e) { next(e); }
}
async function purgerUtilisateur(req, res, next) {
  try {
    res.json(await corbeilleService.purgerUtilisateur(req.params.id, req.utilisateur));
  } catch (e) { next(e); }
}

module.exports = {
  lister, restaurerUtilisateur, restaurerClient, restaurerProduit, purgerUtilisateur,
};
