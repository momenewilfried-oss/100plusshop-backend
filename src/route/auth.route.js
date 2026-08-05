const express = require('express');
const router = express.Router();
const { inscription, connexion, inscriptionAdmin } = require('../controllers/auth.controller');

router.post('/inscription', inscription);
router.post('/inscription-admin', inscriptionAdmin);
router.post('/connexion', connexion);

module.exports = router;
