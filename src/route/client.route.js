const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const autoriserRoles = require('../middleware/role.middleware');
const {
  listerClients,
  obtenirClient,
  creerClient,
  modifierClient,
  supprimerClient,
} = require('../controllers/client.controller');

router.use(verifierToken);

router.get('/', autoriserRoles('administrateur', 'gerant', 'vendeur'), listerClients);
router.get('/:id', autoriserRoles('administrateur', 'gerant', 'vendeur'), obtenirClient);
router.post('/', autoriserRoles('administrateur', 'gerant', 'vendeur'), creerClient);
router.put('/:id', autoriserRoles('administrateur', 'gerant'), modifierClient);
router.delete('/:id', autoriserRoles('administrateur'), supprimerClient);

module.exports = router;