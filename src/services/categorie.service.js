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
  if (!id || Number.isNaN(id)) {
    throw new ApiError(500, 'Création catégorie : id non retourné');
  }

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

async function deleteCategorie(id, user) {
  const row = await categorieRepository.getById(id);
  if (!row) throw new ApiError(404, 'Catégorie introuvable');

  const n = await categorieRepository.countProduits(id);
  if (n > 0) {
    throw new ApiError(
      409,
      `Impossible de supprimer : ${n} produit(s) utilisent cette catégorie`
    );
  }

  const ok = await categorieRepository.remove(id);
  if (!ok) throw new ApiError(404, 'Catégorie introuvable');

  try {
    await logAction({
      userId: user?.id || null,
      module: 'categorie',
      action: 'DELETE',
      oldValue: row,
    });
  } catch (_) {}

  return { message: 'Catégorie supprimée', id: Number(id) };
}

module.exports = { listCategories, createCategorie, deleteCategorie };
