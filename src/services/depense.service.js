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
  const m = Number(montant);
  if (!(m > 0)) {
    throw new ApiError(400, 'Le montant doit être supérieur à zéro');
  }

  const lib = String(libelle).trim();
  const deja = await depenseRepository.existsLibelleIgnoreCase(lib);
  if (deja) {
    throw new ApiError(
      409,
      `Une dépense avec le libellé « ${lib} » existe déjà (majuscules/minuscules ignorées).`
    );
  }

  const id = await depenseRepository.createDepense({
    libelle: lib,
    categorie: categorie || 'autre',
    montant: m,
    dateDepense,
    idUtilisateur: user?.id || null,
  });
  await logAction({
    userId: user?.id || null,
    module: 'depense',
    action: 'CREATE',
    newValue: { id, libelle: lib, montant: m, categorie },
  });
  return { id_depense: id, message: 'Dépense créée' };
}

async function modifierDepense(id, body, user) {
  const payload = { ...(body || {}) };
  if (payload.montant != null) {
    const m = Number(payload.montant);
    if (!(m > 0)) {
      throw new ApiError(400, 'Le montant doit être supérieur à zéro');
    }
    payload.montant = m;
  }
  if (payload.libelle != null) {
    payload.libelle = String(payload.libelle).trim();
    const deja = await depenseRepository.existsLibelleIgnoreCase(payload.libelle, id);
    if (deja) {
      throw new ApiError(
        409,
        `Une dépense avec le libellé « ${payload.libelle} » existe déjà (majuscules/minuscules ignorées).`
      );
    }
  }
  const affected = await depenseRepository.updateDepense(id, payload);
  if (!affected) throw new ApiError(404, 'Dépense introuvable');
  await logAction({
    userId: user?.id || null,
    module: 'depense',
    action: 'UPDATE',
    newValue: { id, ...payload },
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
