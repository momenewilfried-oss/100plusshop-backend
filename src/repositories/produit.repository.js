const pool = require('../config/database');

async function listProducts() {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, c.nom AS categorie_nom, m.nom AS marque_nom,
             COALESCE(SUM(v.stock), 0) AS stock_total
      FROM produit p
      LEFT JOIN categorie c ON p.id_categorie = c.id_categorie
      LEFT JOIN marque m ON p.id_marque = m.id_marque
      LEFT JOIN variante v ON v.id_produit = p.id_produit
      WHERE p.deleted_at IS NULL
      GROUP BY p.id_produit, c.nom, m.nom
      ORDER BY p.id_produit DESC
    `);
    return rows;
  } catch (e) {
    // colonne deleted_at absente
    const [rows] = await pool.query(`
      SELECT p.*, c.nom AS categorie_nom, m.nom AS marque_nom,
             COALESCE(SUM(v.stock), 0) AS stock_total
      FROM produit p
      LEFT JOIN categorie c ON p.id_categorie = c.id_categorie
      LEFT JOIN marque m ON p.id_marque = m.id_marque
      LEFT JOIN variante v ON v.id_produit = p.id_produit
      GROUP BY p.id_produit, c.nom, m.nom
      ORDER BY p.id_produit DESC
    `);
    return rows;
  }
}

async function getProductById(id) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM produit WHERE id_produit = ? AND deleted_at IS NULL',
      [id]
    );
    return rows[0] || null;
  } catch {
    const [rows] = await pool.query('SELECT * FROM produit WHERE id_produit = ?', [id]);
    return rows[0] || null;
  }
}

async function getVariantsByProductId(productId) {
  const [rows] = await pool.query('SELECT * FROM variante WHERE id_produit = ?', [productId]);
  return rows;
}

async function createProduct({ reference, nom, description, idMarque, idCategorie, matiere, genre, saison, prixAchat, prixVente, seuilAlerte, photo, idFournisseur }, connection) {
  const [result] = await connection.query(
    `INSERT INTO produit 
     (reference, nom, description, id_marque, id_categorie, matiere, genre, 
      saison, prix_achat, prix_vente, seuil_alerte, photo, id_fournisseur)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [reference, nom, description, idMarque, idCategorie, matiere, genre,
     saison, prixAchat, prixVente, seuilAlerte || 5, photo, idFournisseur]
  );
  return result.insertId;
}

async function createVariant({ productId, taille, couleur, stock, prixAchat, prixVente, seuilAlerte }, connection) {
  const [result] = await connection.query(
    `INSERT INTO variante
     (id_produit, taille, couleur, stock, prix_achat, prix_vente, seuil_alerte)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [productId, taille, couleur, stock, prixAchat, prixVente, seuilAlerte]
  );
  return result.insertId;
}

async function updateProduct({ id, nom, description, prixAchat, prixVente, seuilAlerte, photo }) {
  await pool.query(
    `UPDATE produit 
     SET nom = COALESCE(?, nom), description = COALESCE(?, description),
         prix_achat = COALESCE(?, prix_achat), prix_vente = COALESCE(?, prix_vente),
         seuil_alerte = COALESCE(?, seuil_alerte), photo = COALESCE(?, photo)
     WHERE id_produit = ?`,
    [nom, description, prixAchat, prixVente, seuilAlerte, photo, id]
  );
}

async function deleteProduct(id) {
  try {
    const [result] = await pool.query(
      'UPDATE produit SET deleted_at = NOW() WHERE id_produit = ? AND deleted_at IS NULL',
      [id]
    );
    if (result.affectedRows > 0) return result.affectedRows;
  } catch { /* fallback hard delete */ }
  const [result] = await pool.query('DELETE FROM produit WHERE id_produit = ?', [id]);
  return result.affectedRows;
}

async function getLowStockProducts() {
  const [rows] = await pool.query(`
    SELECT p.id_produit, p.nom, p.reference, v.id_variante, v.taille,
           v.couleur, v.stock, v.seuil_alerte
    FROM variante v
    JOIN produit p ON v.id_produit = p.id_produit
    WHERE v.stock <= v.seuil_alerte
    ORDER BY v.stock ASC
  `);
  return rows;
}

async function listDeletedProducts() {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM produit WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`
    );
    return rows;
  } catch {
    return [];
  }
}

async function restoreProduct(id) {
  const [result] = await pool.query(
    'UPDATE produit SET deleted_at = NULL WHERE id_produit = ?',
    [id]
  );
  return result.affectedRows;
}

module.exports = {
  listProducts,
  getProductById,
  getVariantsByProductId,
  createProduct,
  createVariant,
  updateProduct,
  deleteProduct,
  listDeletedProducts,
  restoreProduct,
  getLowStockProducts,
};