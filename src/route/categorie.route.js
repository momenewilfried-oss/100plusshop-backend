const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const autoriserRoles = require('../middleware/role.middleware');
const antiDoubleSubmit = require('../middleware/antiDoubleSubmit.middleware');
const { validateRequest } = require('../validators/validateRequest');
const categorieSchemas = require('../validators/categorie.validator');
const {
  listerCategories,
  creerCategorie,
  supprimerCategorie,
} = require('../controllers/categorie.controller');

router.use(verifierToken);

router.get(
  '/',
  autoriserRoles('administrateur', 'gerant', 'vendeur'),
  listerCategories
);
router.post(
  '/',
  autoriserRoles('administrateur', 'gerant'), antiDoubleSubmit(),
  validateRequest(categorieSchemas.creer),
  creerCategorie
);
router.delete(
  '/:id',
  autoriserRoles('administrateur', 'gerant'),
  supprimerCategorie
);

module.exports = router;
