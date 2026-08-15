const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const autoriserRoles = require('../middleware/role.middleware');
const antiDoubleSubmit = require('../middleware/antiDoubleSubmit.middleware');
const {
  listerClients,
  obtenirClient,
  creerClient,
  modifierClient,
  supprimerClient,
} = require('../controllers/client.controller');
const { validateRequest } = require('../validators/validateRequest');
const clientSchemas = require('../validators/client.validator');

router.use(verifierToken);

router.get('/', autoriserRoles('administrateur', 'gerant', 'vendeur'), listerClients);
router.get('/:id', autoriserRoles('administrateur', 'gerant', 'vendeur'), obtenirClient);
router.post(
  '/',
  autoriserRoles('administrateur', 'gerant', 'vendeur'), antiDoubleSubmit(),
  validateRequest(clientSchemas.creer),
  creerClient
);
router.put(
  '/:id',
  autoriserRoles('administrateur', 'gerant'),
  antiDoubleSubmit(),
  validateRequest(clientSchemas.modifier),
  modifierClient
);
router.delete('/:id', autoriserRoles('administrateur'), supprimerClient);

module.exports = router;
