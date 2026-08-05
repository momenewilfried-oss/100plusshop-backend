const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const autoriserRoles = require('../middleware/role.middleware');
const {
  listerDepenses,
  creerDepense,
  modifierDepense,
  supprimerDepense,
} = require('../controllers/depense.controller');

router.use(verifierToken);

router.get('/', autoriserRoles('administrateur', 'gerant'), listerDepenses);
router.post('/', autoriserRoles('administrateur', 'gerant'), creerDepense);
router.put('/:id', autoriserRoles('administrateur', 'gerant'), modifierDepense);
router.delete('/:id', autoriserRoles('administrateur'), supprimerDepense);

module.exports = router;