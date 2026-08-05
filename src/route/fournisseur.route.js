const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const autoriserRoles = require('../middleware/role.middleware');
const {
  listerFournisseurs,
  obtenirFournisseur,
  creerFournisseur,
  modifierFournisseur,
  supprimerFournisseur,
} = require('../controllers/fournisseur.controller');

router.use(verifierToken);

router.get('/', autoriserRoles('administrateur', 'gerant'), listerFournisseurs);
router.get('/:id', autoriserRoles('administrateur', 'gerant'), obtenirFournisseur);
router.post('/', autoriserRoles('administrateur', 'gerant'), creerFournisseur);
router.put('/:id', autoriserRoles('administrateur', 'gerant'), modifierFournisseur);
router.delete('/:id', autoriserRoles('administrateur'), supprimerFournisseur);

module.exports = router;