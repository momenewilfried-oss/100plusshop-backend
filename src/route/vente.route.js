const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const autoriserRoles = require('../middleware/role.middleware');
const antiDoubleSubmit = require('../middleware/antiDoubleSubmit.middleware');
const { validateRequest } = require('../validators/validateRequest');
const venteSchemas = require('../validators/vente.validator');
const {
  listerVentes,
  obtenirVente,
  creerVente,
  annulerVente,
} = require('../controllers/vente.controller');

router.use(verifierToken);

router.get('/', autoriserRoles('administrateur', 'gerant', 'vendeur'), listerVentes);
router.get('/:id', autoriserRoles('administrateur', 'gerant', 'vendeur'), obtenirVente);
router.post('/', autoriserRoles('administrateur', 'gerant', 'vendeur'), antiDoubleSubmit(), validateRequest(venteSchemas.creer), creerVente);
router.patch('/:id/annuler', autoriserRoles('administrateur', 'gerant'), annulerVente);

module.exports = router;
