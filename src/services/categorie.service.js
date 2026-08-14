const { ApiError } = require('../utils/error-handler');
const categorieRepository = require('../repositories/categorie.repository');
const { logAction } = require('./audit.service');

async function listCategories() {
  return categorieRepository.listCategories();
}

async function createCategorie(body, user) {
  const nom = String(body?.nom || '').trim();
  if (!nom) throw new ApiError(400, 'Le nom de la catégorie est obligatoire');
  if (nom.length > 100) throw new ApiError(400, 'Nom trop long (max 100)');

  const exists = await categorieRepository.findByNom(nom);
  if (exists) throw new ApiError(409, 'Cette catégorie existe déjà');

  const id = await categorieRepository.create({
    nom,
    description: body?.description ? String(body.description).trim() : null,
  });
  if (!id) throw new ApiError(500, 'Création catégorie : id non retourné');

  const row = await categorieRepository.getById(id);
  try {
    await logAction({
      userId: user?.id || null,
      module: 'categorie',
      action: 'CREATE',
      newValue: row,
    });
  } catch (_) {}
  return row;
}

module.exports = { listCategories, createCategorie };
