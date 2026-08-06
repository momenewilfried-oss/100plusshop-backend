const pool = require('../config/database');

async function resumeStocks() {
  const [total] = await pool.query(
    'SELECT COALESCE(SUM(stock), 0) AS total_articles FROM variante'
  );
  return total[0];
}

async function listMouvements() {
  const [rows] = await pool.query(`
    SELECT m.*, p.nom AS produit_nom, v.taille, v.couleur
    FROM mouvement_stock m
    LEFT JOIN variante v ON m.variante = v.id_variante OR m.id_variante = v.id_variante
    LEFT JOIN produit p ON v.id_produit = p.id_produit
    ORDER BY m.dateMouvement DESC, m.date_mouvement DESC
    LIMIT 200
  `).catch(async () => {
    const [rows] = await pool.query(`
      SELECT m.*, p.nom AS produit_nom, v.taille, v.couleur
      FROM mouvement_stock m
      LEFT JOIN variante v ON m.id_variante = v.id_variante
      LEFT JOIN produit p ON v.id_produit = p.id_produit
      ORDER BY m.date_mouvement DESC
      LIMIT 200
    `);
    return [rows];
  });
  return Array.isArray(rows) ? rows : rows;
}

async function alertesStock() {
  const [rows] = await pool.query(`
    SELECT p.nom AS produit_nom, p.reference, v.id_variante, v.taille, v.couleur,
           v.stock, v.seuil_alerte
    FROM variante v
    JOIN produit p ON v.id_produit = p.id_produit
    WHERE v.stock <= v.seuil_alerte
    ORDER BY v.stock ASC
  `);
  return rows;
}

async function getVarianteForUpdate(db, idVariante) {
  const [rows] = await db.query(
    'SELECT stock FROM variante WHERE id_variante = ? FOR UPDATE',
    [idVariante]
  );
  return rows[0] || null;
}

async function updateVarianteStock(db, idVariante, nouveauStock) {
  await db.query('UPDATE variante SET stock = ? WHERE id_variante = ?', [
    nouveauStock,
    idVariante,
  ]);
}

async function insertMouvement(db, { idVariante, typeMouvement, quantite, motif }) {
  try {
    const [r] = await db.query(
      `INSERT INTO mouvement_stock (id_variante, type_mouvement, quantite, motif, document_type, document_id, date_mouvement)
       VALUES (?, ?, ?, ?, 'manuel', NULL, NOW())`,
      [idVariante, typeMouvement, quantite, motif || 'Mouvement manuel']
    );
    return r.insertId;
  } catch {
    const [r] = await db.query(
      `INSERT INTO mouvement_stock (variante, typeMouvement, quantite, motif, documentType, documentId, dateMouvement)
       VALUES (?, ?, ?, ?, 'manuel', NULL, NOW())`,
      [idVariante, typeMouvement, quantite, motif || 'Mouvement manuel']
    );
    return r.insertId;
  }
}

module.exports = {
  resumeStocks,
  listMouvements,
  alertesStock,
  getVarianteForUpdate,
  updateVarianteStock,
  insertMouvement,
};
