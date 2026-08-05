const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const autoriserRoles = require('../middleware/role.middleware');
const {
  listerFactures,
  obtenirFacture,
  creerFactureDepuisVente,
  modifierStatutFacture,
  resumeFactures,
  genererPdfFacture
} = require('../controllers/facture.controller');

router.use(verifierToken);

// resume accessible aussi au vendeur (évite erreur sur l'écran Factures)
router.get('/resume', autoriserRoles('administrateur', 'gerant', 'vendeur'), resumeFactures);
router.get('/', autoriserRoles('administrateur', 'gerant', 'vendeur'), listerFactures);
router.get('/:id', autoriserRoles('administrateur', 'gerant', 'vendeur'), obtenirFacture);

router.post('/', autoriserRoles('administrateur', 'gerant', 'vendeur'), creerFactureDepuisVente);
router.patch('/:id/statut', autoriserRoles('administrateur', 'gerant'), modifierStatutFacture);
router.get('/:id/pdf', autoriserRoles('administrateur', 'gerant', 'vendeur'), genererPdfFacture);

module.exports = router;