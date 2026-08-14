const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const autoriserRoles = require('../middleware/role.middleware');
const { listerMarques, creerMarque } = require('../controllers/marque.controller');

router.use(verifierToken);

router.get('/', autoriserRoles('administrateur', 'gerant', 'vendeur'), listerMarques);
router.post('/', autoriserRoles('administrateur', 'gerant'), creerMarque);

module.exports = router;
