const { ApiError } = require('../utils/error-handler');
const depenseRepository = require('../repositories/depense.repository');
const { logAction } = require('./audit.service');

async function listerDepenses(filters = {}) {
  return depenseRepository.listDepenses(filters);
}

async function creerDepense(body, user) {
  const { libelle, categorie, montant, dateDepense } = body || {};
  if (!libelle || montant == null) {
    throw new ApiError(400, 'libelle et montant obligatoires');
  }
  const id = await depenseRepository.createDepense({
    libelle,
    categorie,
    montant,
    dateDepense,
    idUtilisateur: user?.id || null,
  });
  await logAction({
    userId: user?.id || null,
    module: 'depense',
    action: 'CREATE',
    newValue: { id, libelle, montant, categorie },
  });
  return { id_depense: id, message: 'Dépense créée' };
}

async function modifierDepense(id, body, user) {
  const affected = await depenseRepository.updateDepense(id, body || {});
  if (!affected) throw new ApiError(404, 'Dépense introuvable');
  await logAction({
    userId: user?.id || null,
    module: 'depense',
    action: 'UPDATE',
    newValue: { id, ...body },
  });
  return { message: 'Dépense modifiée' };
}

async function supprimerDepense(id, user) {
  const affected = await depenseRepository.deleteDepense(id);
  if (!affected) throw new ApiError(404, 'Dépense introuvable');
  await logAction({
    userId: user?.id || null,
    module: 'depense',
    action: 'DELETE',
    oldValue: { id },
  });
  return { message: 'Dépense supprimée' };
}

module.exports = {
  listerDepenses,
  creerDepense,
  modifierDepense,
  supprimerDepense,
};