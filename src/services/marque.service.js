const { ApiError } = require('../utils/error-handler');
const marqueRepository = require('../repositories/marque.repository');
const { logAction } = require('./audit.service');

async function listMarques() {
  return marqueRepository.listMarques();
}

async function createMarque(body, user) {
  const nom = String(body?.nom || '').trim();
  if (!nom) throw new ApiError(400, 'Le nom de la marque est obligatoire');
  if (nom.length > 100) throw new ApiError(400, 'Nom trop long (max 100)');

  const exists = await marqueRepository.findByNom(nom);
  if (exists) throw new ApiError(409, 'Cette marque existe déjà');

  const id = await marqueRepository.create({
    nom,
    description: body?.description ? String(body.description).trim() : null,
  });
  if (!id) throw new ApiError(500, 'Création marque : id non retourné');

  const row = await marqueRepository.getById(id);
  try {
    await logAction({
      userId: user?.id || null,
      module: 'marque',
      action: 'CREATE',
      newValue: row,
    });
  } catch (_) {}
  return row;
}

module.exports = { listMarques, createMarque };
