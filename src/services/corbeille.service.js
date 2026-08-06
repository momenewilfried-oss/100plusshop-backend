const pool = require('../config/database');
const { ApiError } = require('../utils/error-handler');
const { logAction } = require('./audit.service');
const utilisateurRepository = require('../repositories/utilisateur.repository');
const produitRepository = require('../repositories/produit.repository');

async function listerCorbeille() {
  const result = { utilisateurs: [], clients: [], produits: [] };

  try {
    const [users] = await pool.query(
      `SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.statut, r.libelle AS role
       FROM utilisateur u
       LEFT JOIN role r ON u.id_role = r.id_role
       WHERE u.statut = 'supprime'
       ORDER BY u.id_utilisateur DESC`
    );
    result.utilisateurs = users;
  } catch { /* ignore */ }

  try {
    const [clients] = await pool.query(
      `SELECT * FROM client WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`
    );
    result.clients = clients;
  } catch { /* colonne absente */ }

  try {
    result.produits = await produitRepository.listDeletedProducts();
  } catch { /* ignore */ }

  return result;
}

async function restaurerUtilisateur(id, user) {
  const [r] = await pool.query(
    `UPDATE utilisateur SET statut = 'actif' WHERE id_utilisateur = ? AND statut = 'supprime'`,
    [id]
  );
  if (!r.affectedRows) throw new ApiError(404, 'Utilisateur introuvable dans la corbeille');
  await logAction({
    userId: user?.id || null,
    module: 'utilisateur',
    action: 'RESTORE',
    newValue: { id },
  });
  return { message: 'Utilisateur restauré' };
}

async function restaurerClient(id, user) {
  const [r] = await pool.query(
    `UPDATE client SET deleted_at = NULL WHERE id_client = ? AND deleted_at IS NOT NULL`,
    [id]
  );
  if (!r.affectedRows) throw new ApiError(404, 'Client introuvable dans la corbeille');
  await logAction({
    userId: user?.id || null,
    module: 'client',
    action: 'RESTORE',
    newValue: { id },
  });
  return { message: 'Client restauré' };
}

async function restaurerProduit(id, user) {
  const n = await produitRepository.restoreProduct(id);
  if (!n) throw new ApiError(404, 'Produit introuvable dans la corbeille');
  await logAction({
    userId: user?.id || null,
    module: 'produit',
    action: 'RESTORE',
    newValue: { id },
  });
  return { message: 'Produit restauré' };
}

/** Suppression définitive (> optionnel, admin only) */
async function purgerUtilisateur(id, user) {
  const [r] = await pool.query(
    `DELETE FROM utilisateur WHERE id_utilisateur = ? AND statut = 'supprime'`,
    [id]
  );
  if (!r.affectedRows) throw new ApiError(404, 'Utilisateur introuvable dans la corbeille');
  await logAction({
    userId: user?.id || null,
    module: 'utilisateur',
    action: 'HARD_DELETE',
    oldValue: { id },
  });
  return { message: 'Utilisateur définitivement supprimé' };
}

module.exports = {
  listerCorbeille,
  restaurerUtilisateur,
  restaurerClient,
  restaurerProduit,
  purgerUtilisateur,
};
