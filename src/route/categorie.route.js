const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const autoriserRoles = require('../middleware/role.middleware');
const {
  listerCategories,
  creerCategorie,
} = require('../controllers/categorie.controller');

router.use(verifierToken);

router.get('/', autoriserRoles('administrateur', 'gerant', 'vendeur'), listerCategories);
router.post('/', autoriserRoles('administrateur', 'gerant'), creerCategorie);

module.exports = router;
