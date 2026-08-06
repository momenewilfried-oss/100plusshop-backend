const express = require('express');
const router = express.Router();
const { inscription, connexion, inscriptionAdmin } = require('../controllers/auth.controller');
const { validateRequest } = require('../validators/validateRequest');
const authSchemas = require('../validators/auth.schema');

router.post('/inscription', validateRequest(authSchemas.register), inscription);
router.post('/inscription-admin', validateRequest(authSchemas.register), inscriptionAdmin);
router.post('/connexion', validateRequest(authSchemas.login), connexion);

module.exports = router;
