const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const autoriserRoles = require('../middleware/role.middleware');
const { listerLogs } = require('../controllers/audit.controller');

router.use(verifierToken);
router.get('/', autoriserRoles('administrateur', 'gerant'), listerLogs);

module.exports = router;
