const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const autoriserRoles = require('../middleware/role.middleware');
const {
  listerVentes,
  obtenirVente,
  creerVente,
  annulerVente,
} = require('../controllers/vente.controller');

router.use(verifierToken);

router.get('/', autoriserRoles('administrateur', 'gerant', 'vendeur'), listerVentes);
router.get('/:id', autoriserRoles('administrateur', 'gerant', 'vendeur'), obtenirVente);
router.post('/', autoriserRoles('administrateur', 'gerant', 'vendeur'), creerVente);
router.patch('/:id/annuler', autoriserRoles('administrateur', 'gerant'), annulerVente);

module.exports = router;