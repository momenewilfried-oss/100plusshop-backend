const { ApiError } = require('../utils/error-handler');
const fournisseurRepository = require('../repositories/fournisseur.repository');
const { logAction } = require('./audit.service');
const {
  assertEmailOptional,
  assertPhoneOptional,
} = require('../utils/validators');

async function listFournisseurs() {
  return fournisseurRepository.listFournisseurs();
}

async function getFournisseurById(id) {
  const row = await fournisseurRepository.getFournisseurById(id);
  if (!row) throw new ApiError(404, 'Fournisseur introuvable');
  return row;
}

async function createFournisseur(body, user) {
  const { nom, contact, adresse } = body || {};
  if (!nom || !String(nom).trim()) {
    throw new ApiError(400, 'nom obligatoire');
  }

  const email = assertEmailOptional(body?.email, ApiError);
  const telephone = assertPhoneOptional(body?.telephone, ApiError);

  if (email) {
    const exists = await fournisseurRepository.findByEmail(email);
    if (exists) {
      throw new ApiError(409, 'Un fournisseur avec cet e-mail existe déjà');
    }
  }
  if (telephone) {
    const exists = await fournisseurRepository.findByTelephone(telephone);
    if (exists) {
      throw new ApiError(409, 'Un fournisseur avec ce numéro de téléphone existe déjà');
    }
  }
  {
    const [rows] = await require('../config/database').query(
      'SELECT id_fournisseur FROM fournisseur WHERE LOWER(TRIM(nom)) = LOWER(TRIM(?)) LIMIT 1',
      [String(nom).trim()]
    );
    if (rows && rows.length) {
      throw new ApiError(409, `Un fournisseur nommé « ${String(nom).trim()} » existe déjà`);
    }
  }

  const id = await fournisseurRepository.createFournisseur({
    nom: String(nom).trim(),
    contact: contact || null,
    email,
    telephone,
    adresse: adresse || null,
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

  const payload = { ...(body || {}) };
  if (payload.email !== undefined) {
    payload.email = assertEmailOptional(payload.email, ApiError);
    if (payload.email) {
      const exists = await fournisseurRepository.findByEmail(payload.email, id);
      if (exists) {
        throw new ApiError(409, 'Un fournisseur avec cet e-mail existe déjà');
      }
    }
  }
  if (payload.telephone !== undefined) {
    payload.telephone = assertPhoneOptional(payload.telephone, ApiError);
    if (payload.telephone) {
      const exists = await fournisseurRepository.findByTelephone(
        payload.telephone,
        id
      );
      if (exists) {
        throw new ApiError(
          409,
          'Un fournisseur avec ce numéro de téléphone existe déjà'
        );
      }
    }
  }
  if (payload.nom !== undefined && !String(payload.nom).trim()) {
    throw new ApiError(400, 'nom ne peut pas être vide');
  }

  await fournisseurRepository.updateFournisseur(id, payload);
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
