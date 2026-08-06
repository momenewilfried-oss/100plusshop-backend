const rapportService = require('../services/rapport.service');

async function rapportComptable(req, res, next) {
  try {
    const result = await rapportService.rapportComptable(req.query || {});
    res.json(result);
  } catch (erreur) {
    next(erreur);
  }
}

async function exportRapportExcel(req, res, next) {
  try {
    const { buffer, filename } = await rapportService.exportRapportExcel(req.query || {});
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  } catch (erreur) {
    next(erreur);
  }
}

module.exports = { rapportComptable, exportRapportExcel };