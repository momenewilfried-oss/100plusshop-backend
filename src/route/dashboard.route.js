const express = require('express');
const router = express.Router();
const verifierToken = require('../middleware/auth.middleware');
const { getDashboard } = require('../controllers/dashboard.controller');

router.use(verifierToken);

router.get('/', getDashboard);

module.exports = router;  