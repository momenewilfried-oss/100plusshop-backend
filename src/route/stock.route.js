const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const autoriserRoles = require('../middleware/role.middleware');
const antiDoubleSubmit = require('../middleware/antiDoubleSubmit.middleware');
const { validateRequest } = require('../validators/validateRequest');
const stockSchemas = require('../validators/stock.validator');
const {
  resumeStocks,
  listerMouvements,
  alertesStock,
  analyseFlux,
  creerMouvement,
} = require('../controllers/stock.controller');

router.use(verifierToken);

router.get('/resume', resumeStocks);
router.get('/mouvements', listerMouvements);
router.get('/alertes', alertesStock);
router.get('/flux', analyseFlux);
router.post(
  '/mouvements',
  autoriserRoles('administrateur', 'gerant'), antiDoubleSubmit(),
  validateRequest(stockSchemas.mouvement),
  creerMouvement
);

module.exports = router;
