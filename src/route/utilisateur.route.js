const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const autoriserRoles = require('../middleware/role.middleware');
const {
  listerUtilisateurs,
  listerRoles,
  obtenirUtilisateur,
  creerUtilisateur,
  modifierUtilisateur,
  supprimerUtilisateur,
} = require('../controllers/utilisateur.controller');
const { validateRequest } = require('../validators/validateRequest');
const utilisateurSchemas = require('../validators/utilisateur.validator');

router.use(verifierToken);

router.get('/', autoriserRoles('administrateur'), listerUtilisateurs);
router.get('/roles', autoriserRoles('administrateur'), listerRoles);
router.get('/:id', autoriserRoles('administrateur'), obtenirUtilisateur);
router.post(
  '/',
  autoriserRoles('administrateur'),
  validateRequest(utilisateurSchemas.creer),
  creerUtilisateur
);
router.put(
  '/:id',
  autoriserRoles('administrateur'),
  validateRequest(utilisateurSchemas.modifier),
  modifierUtilisateur
);
router.delete('/:id', autoriserRoles('administrateur'), supprimerUtilisateur);

module.exports = router;