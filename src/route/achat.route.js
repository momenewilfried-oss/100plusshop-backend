const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const autoriserRoles = require('../middleware/role.middleware');
const { listerAchats, obtenirAchat, creerAchat } = require('../controllers/achat.controller');

router.use(verifierToken);

router.get('/', autoriserRoles('administrateur', 'gerant'), listerAchats);
router.get('/:id', autoriserRoles('administrateur', 'gerant'), obtenirAchat);
router.post('/', autoriserRoles('administrateur', 'gerant'), creerAchat);

module.exports = router;