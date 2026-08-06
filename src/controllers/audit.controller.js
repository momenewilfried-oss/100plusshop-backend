const auditService = require('../services/audit.service');

async function listerLogs(req, res, next) {
  try {
    const { module, action, limit, offset } = req.query || {};
    const rows = await auditService.listLogs({ module, action, limit, offset });
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

module.exports = { listerLogs };
