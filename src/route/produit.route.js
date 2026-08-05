const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const autoriserRoles = require('../middleware/role.middleware');
const {
  listerProduits,
  obtenirProduit,
  creerProduit,
  modifierProduit,
  supprimerProduit,
  produitsStockFaible,
  creerVariante,
} = require('../controllers/produit.controller');

router.use(verifierToken);

// Lecture : tous les rôles connectés
router.get('/', autoriserRoles('administrateur', 'gerant', 'vendeur'), listerProduits);
router.get('/stock-faible', autoriserRoles('administrateur', 'gerant', 'vendeur'), produitsStockFaible);
router.get('/:id', autoriserRoles('administrateur', 'gerant', 'vendeur'), obtenirProduit);

// Écriture produit : admin + gérant
router.post('/', autoriserRoles('administrateur', 'gerant'), creerProduit);
router.put('/:id', autoriserRoles('administrateur', 'gerant'), modifierProduit);
router.delete('/:id', autoriserRoles('administrateur'), supprimerProduit);

// Variante : admin + gérant
router.post('/:id/variantes', autoriserRoles('administrateur', 'gerant'), creerVariante);

module.exports = router;