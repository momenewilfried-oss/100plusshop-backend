const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const autoriserRoles = require('../middleware/role.middleware');
const antiDoubleSubmit = require('../middleware/antiDoubleSubmit.middleware');
const {
  listerFournisseurs,
  obtenirFournisseur,
  creerFournisseur,
  modifierFournisseur,
  supprimerFournisseur,
} = require('../controllers/fournisseur.controller');
const { validateRequest } = require('../validators/validateRequest');
const fournisseurSchemas = require('../validators/fournisseur.validator');

router.use(verifierToken);

router.get('/', autoriserRoles('administrateur', 'gerant'), listerFournisseurs);
router.get('/:id', autoriserRoles('administrateur', 'gerant'), obtenirFournisseur);
router.post(
  '/',
  autoriserRoles('administrateur', 'gerant'), antiDoubleSubmit(),
  validateRequest(fournisseurSchemas.creer),
  creerFournisseur
);
router.put(
  '/:id',
  autoriserRoles('administrateur', 'gerant'),
  antiDoubleSubmit(),
  validateRequest(fournisseurSchemas.modifier),
  modifierFournisseur
);
router.delete('/:id', autoriserRoles('administrateur'), supprimerFournisseur);

module.exports = router;
