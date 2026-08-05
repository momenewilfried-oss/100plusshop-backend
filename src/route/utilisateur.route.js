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

router.use(verifierToken);

// Admin uniquement pour la gestion des comptes
router.get('/', autoriserRoles('administrateur'), listerUtilisateurs);
router.get('/roles', autoriserRoles('administrateur'), listerRoles);
router.get('/:id', autoriserRoles('administrateur'), obtenirUtilisateur);
router.post('/', autoriserRoles('administrateur'), creerUtilisateur);
router.put('/:id', autoriserRoles('administrateur'), modifierUtilisateur);
router.delete('/:id', autoriserRoles('administrateur'), supprimerUtilisateur);

module.exports = router;