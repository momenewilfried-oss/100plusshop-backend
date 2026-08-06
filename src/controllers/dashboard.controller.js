const dashboardService = require('../services/dashboard.service');

async function getDashboard(req, res, next) {
  try {
    const result = await dashboardService.getDashboard();
    res.json(result);
  } catch (erreur) {
    next(erreur);
  }
}

module.exports = { getDashboard };