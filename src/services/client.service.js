const { ApiError } = require('../utils/error-handler');
const { assertEmailOptional, assertPhoneOptional } = require('../utils/validators');
const clientRepository = require('../repositories/client.repository');
const { logAction } = require('./audit.service');

async function listerClients() {
  return clientRepository.listClients();
}

async function obtenirClient(id) {
  const client = await clientRepository.getClientById(id);
  if (!client) throw new ApiError(404, 'Client introuvable');
  return client;
}

async function creerClient(body, user) {
  const { nom, prenom } = body || {};
  if (!nom && !prenom) throw new ApiError(400, 'nom ou prenom obligatoire');
  const email = assertEmailOptional(body?.email, ApiError);
  const telephone = assertPhoneOptional(body?.telephone, ApiError);

  if (email) {
    const ex = await clientRepository.findByEmail(email);
    if (ex) throw new ApiError(409, 'Un client avec cet e-mail existe déjà');
  }
  if (telephone) {
    const ex = await clientRepository.findByTelephone(telephone);
    if (ex) throw new ApiError(409, 'Un client avec ce numéro de téléphone existe déjà');
  }
  const exNom = await clientRepository.findByNomPrenom(nom, prenom);
  if (exNom) {
    throw new ApiError(409, 'Un client avec le même nom et prénom existe déjà');
  }

  const id = await clientRepository.createClient({ nom, prenom, telephone, email });
  const created = await clientRepository.getClientById(id);
  await logAction({
    userId: user?.id || null,
    module: 'client',
    action: 'CREATE',
    newValue: created,
  });
  return created;
}

async function modifierClient(id, body, user) {
  const before = await clientRepository.getClientById(id);
  if (!before) throw new ApiError(404, 'Client introuvable');
  const payload = { ...(body || {}) };
  if (payload.email !== undefined) {
    payload.email = assertEmailOptional(payload.email, ApiError);
  }
  if (payload.telephone !== undefined) {
    payload.telephone = assertPhoneOptional(payload.telephone, ApiError);
  }
  await clientRepository.updateClient(id, payload);
  const after = await clientRepository.getClientById(id);
  await logAction({
    userId: user?.id || null,
    module: 'client',
    action: 'UPDATE',
    oldValue: before,
    newValue: after,
  });
  return after;
}

async function supprimerClient(id, user) {
  const before = await clientRepository.getClientById(id);
  if (!before) throw new ApiError(404, 'Client introuvable');

  const pool = require('../config/database');
  const [ventes] = await pool.query(
    'SELECT COUNT(*) AS n FROM vente WHERE id_client = ?',
    [id]
  );
  if (Number(ventes[0]?.n || 0) > 0) {
    throw new ApiError(
      409,
      'Impossible de supprimer ce client : des ventes sont déjà enregistrées. Vous pouvez le conserver ou le désactiver autrement.'
    );
  }

  const affected = await clientRepository.deleteClient(id);
  if (!affected) throw new ApiError(404, 'Client introuvable');
  await logAction({
    userId: user?.id || null,
    module: 'client',
    action: 'SOFT_DELETE',
    oldValue: before,
  });
  return { message: 'Client déplacé vers la corbeille' };
}

module.exports = {
  listerClients,
  obtenirClient,
  creerClient,
  modifierClient,
  supprimerClient,
};
