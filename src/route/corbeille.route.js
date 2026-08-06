const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const autoriserRoles = require('../middleware/role.middleware');
const {
  lister,
  restaurerUtilisateur,
  restaurerClient,
  restaurerProduit,
  purgerUtilisateur,
} = require('../controllers/corbeille.controller');

router.use(verifierToken);
router.use(autoriserRoles('administrateur'));

router.get('/', lister);
router.post('/utilisateurs/:id/restore', restaurerUtilisateur);
router.post('/clients/:id/restore', restaurerClient);
router.post('/produits/:id/restore', restaurerProduit);
router.delete('/utilisateurs/:id', purgerUtilisateur);

module.exports = router;
