const auditService = require('../services/audit.service');

async function listerLogs(req, res, next) {
  try {
    const { module, action, limit, offset, page } = req.query || {};
    const result = await auditService.listLogs({ module, action, limit, offset, page });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

module.exports = { listerLogs };