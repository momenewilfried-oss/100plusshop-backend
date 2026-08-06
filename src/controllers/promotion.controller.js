const promotionService = require('../services/promotion.service');

async function listerPromotions(req, res, next) {
  try {
    const rows = await promotionService.listPromotions();
    res.json(rows);
  } catch (erreur) {
    next(erreur);
  }
}

async function obtenirPromotion(req, res, next) {
  try {
    const result = await promotionService.getPromotion(req.params.id);
    if (!result) return res.status(404).json({ message: 'Promotion introuvable' });
    res.json(result);
  } catch (erreur) {
    next(erreur);
  }
}

async function creerPromotion(req, res, next) {
  try {
    const row = await promotionService.createPromotion(req.body || {});
    res.status(201).json(row);
  } catch (erreur) {
    next(erreur);
  }
}

async function modifierPromotion(req, res, next) {
  try {
    const row = await promotionService.updatePromotion(req.params.id, req.body || {});
    res.json(row);
  } catch (erreur) {
    next(erreur);
  }
}

async function supprimerPromotion(req, res, next) {
  try {
    const result = await promotionService.deletePromotion(req.params.id);
    res.json(result);
  } catch (erreur) {
    next(erreur);
  }
}

async function promoPourVariante(req, res, next) {
  try {
    const row = await promotionService.promoForVariant(req.params.idVariante);
    res.json(row);
  } catch (erreur) {
    next(erreur);
  }
}

module.exports = {
  listerPromotions,
  obtenirPromotion,
  creerPromotion,
  modifierPromotion,
  supprimerPromotion,
  promoPourVariante,
};