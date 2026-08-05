const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const autoriserRoles = require('../middleware/role.middleware');
const {
  rapportComptable,
  exportRapportExcel,
} = require('../controllers/rapport.controller');

router.use(verifierToken);

// Export Excel AVANT les routes génériques
router.get(
  '/comptable/export',
  autoriserRoles('administrateur', 'gerant'),
  exportRapportExcel
);

router.get(
  '/comptable',
  autoriserRoles('administrateur', 'gerant'),
  rapportComptable
);

module.exports = router;