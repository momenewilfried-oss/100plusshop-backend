const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const autoriserRoles = require('../middleware/role.middleware');
const { listerAchats, obtenirAchat, creerAchat } = require('../controllers/achat.controller');
const { validateRequest } = require('../validators/validateRequest');
const achatSchemas = require('../validators/achat.validator');

router.use(verifierToken);

router.get('/', autoriserRoles('administrateur', 'gerant'), listerAchats);
router.get('/:id', autoriserRoles('administrateur', 'gerant'), obtenirAchat);
router.post('/', autoriserRoles('administrateur', 'gerant'), validateRequest(achatSchemas.creer), creerAchat);

module.exports = router;