const authService = require('../services/auth.service');

async function inscription(req, res, next) {
  try {
    const result = await authService.inscription(req.body);
    res.status(201).json(result);
  } catch (erreur) {
    next(erreur);
  }
}

async function connexion(req, res, next) {
  try {
    const result = await authService.connexion(req.body);
    res.json(result);
  } catch (erreur) {
    next(erreur);
  }
}

async function inscriptionAdmin(req, res, next) {
  try {
    const result = await authService.inscriptionAdmin(req.body);
    res.status(201).json(result);
  } catch (erreur) {
    next(erreur);
  }
}

module.exports = { inscription, connexion, inscriptionAdmin };