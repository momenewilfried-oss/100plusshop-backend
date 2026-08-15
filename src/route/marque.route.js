const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const autoriserRoles = require('../middleware/role.middleware');
const antiDoubleSubmit = require('../middleware/antiDoubleSubmit.middleware');
const { validateRequest } = require('../validators/validateRequest');
const marqueSchemas = require('../validators/marque.validator');
const {
  listerMarques,
  creerMarque,
  supprimerMarque,
} = require('../controllers/marque.controller');

router.use(verifierToken);

router.get(
  '/',
  autoriserRoles('administrateur', 'gerant', 'vendeur'),
  listerMarques
);
router.post(
  '/',
  autoriserRoles('administrateur', 'gerant'), antiDoubleSubmit(),
  validateRequest(marqueSchemas.creer),
  creerMarque
);
router.delete(
  '/:id',
  autoriserRoles('administrateur', 'gerant'),
  supprimerMarque
);

module.exports = router;
