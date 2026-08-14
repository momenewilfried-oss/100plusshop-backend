const categorieService = require('../services/categorie.service');

async function listerCategories(req, res, next) {
  try {
    res.json(await categorieService.listCategories());
  } catch (e) {
    next(e);
  }
}

async function creerCategorie(req, res, next) {
  try {
    const row = await categorieService.createCategorie(req.body || {}, req.utilisateur);
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

module.exports = { listerCategories, creerCategorie };
