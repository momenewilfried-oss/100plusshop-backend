const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const { validateRequest } = require('../validators/validateRequest');
const promotionSchemas = require('../validators/promotion.validator');
const autoriserRoles = require('../middleware/role.middleware');
const {
  listerPromotions,
  obtenirPromotion,
  creerPromotion,
  modifierPromotion,
  supprimerPromotion,
  promoPourVariante,
} = require('../controllers/promotion.controller');

router.use(verifierToken);

router.get('/', autoriserRoles('administrateur', 'gerant', 'vendeur'), listerPromotions);
router.get('/variante/:idVariante', autoriserRoles('administrateur', 'gerant', 'vendeur'), promoPourVariante);
router.get('/:id', autoriserRoles('administrateur', 'gerant', 'vendeur'), obtenirPromotion);

router.post('/', autoriserRoles('administrateur', 'gerant'), validateRequest(promotionSchemas.creer), creerPromotion);
router.put('/:id', autoriserRoles('administrateur', 'gerant'), validateRequest(promotionSchemas.modifier), modifierPromotion);
router.delete('/:id', autoriserRoles('administrateur'), supprimerPromotion);

module.exports = router;