const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const autoriserRoles = require('../middleware/role.middleware');
const stockController = require('../controllers/stock.controller');

router.use(verifierToken);

router.get('/resume', stockController.resumeStocks);
router.get('/mouvements', stockController.listerMouvements);
router.get('/alertes', stockController.alertesStock);
router.get('/flux', stockController.analyseFlux);
router.post('/mouvements', autoriserRoles('administrateur'), stockController.creerMouvement);

module.exports = router;