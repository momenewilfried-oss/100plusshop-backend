const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const autoriserRoles = require('../middleware/role.middleware');
const antiDoubleSubmit = require('../middleware/antiDoubleSubmit.middleware');
const {
  listerDepenses,
  creerDepense,
  modifierDepense,
  supprimerDepense,
} = require('../controllers/depense.controller');
const { validateRequest } = require('../validators/validateRequest');
const depenseSchemas = require('../validators/depense.validator');

router.use(verifierToken);

router.get('/', autoriserRoles('administrateur', 'gerant'), listerDepenses);
router.post(
  '/',
  autoriserRoles('administrateur', 'gerant'), antiDoubleSubmit(),
  validateRequest(depenseSchemas.creer),
  creerDepense
);
router.put(
  '/:id',
  autoriserRoles('administrateur', 'gerant'),
  antiDoubleSubmit(),
  validateRequest(depenseSchemas.modifier),
  modifierDepense
);
router.delete('/:id', autoriserRoles('administrateur'), supprimerDepense);

module.exports = router;
