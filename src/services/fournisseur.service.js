const { ApiError } = require('../utils/error-handler');
const fournisseurRepository = require('../repositories/fournisseur.repository');
const { logAction } = require('./audit.service');

async function listFournisseurs() {
  return fournisseurRepository.listFournisseurs();
}

async function getFournisseurById(id) {
  const row = await fournisseurRepository.getFournisseurById(id);
  if (!row) throw new ApiError(404, 'Fournisseur introuvable');
  return row;
}

async function createFournisseur(body, user) {
  const { nom, contact, email, telephone, adresse } = body || {};
  if (!nom) throw new ApiError(400, 'nom obligatoire');
  const id = await fournisseurRepository.createFournisseur({
    nom,
    contact,
    email,
    telephone,
    adresse,
  });
  const row = await fournisseurRepository.getFournisseurById(id);
  await logAction({
    userId: user?.id || null,
    module: 'fournisseur',
    action: 'CREATE',
    newValue: row,
  });
  return row;
}

async function updateFournisseur(id, body, user) {
  const before = await fournisseurRepository.getFournisseurById(id);
  if (!before) throw new ApiError(404, 'Fournisseur introuvable');
  await fournisseurRepository.updateFournisseur(id, body || {});
  const after = await fournisseurRepository.getFournisseurById(id);
  await logAction({
    userId: user?.id || null,
    module: 'fournisseur',
    action: 'UPDATE',
    oldValue: before,
    newValue: after,
  });
  return after;
}

async function deleteFournisseur(id, user) {
  const before = await fournisseurRepository.getFournisseurById(id);
  const affected = await fournisseurRepository.deleteFournisseur(id);
  if (!affected) throw new ApiError(404, 'Fournisseur introuvable');
  await logAction({
    userId: user?.id || null,
    module: 'fournisseur',
    action: 'DELETE',
    oldValue: before,
  });
  return { message: 'Fournisseur supprimé' };
}

module.exports = {
  listFournisseurs,
  getFournisseurById,
  createFournisseur,
  updateFournisseur,
  deleteFournisseur,
};