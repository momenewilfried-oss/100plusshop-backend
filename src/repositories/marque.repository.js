const pool = require('../config/database');

async function listMarques() {
  const [rows] = await pool.query(
    `SELECT m.id_marque, m.nom, m.description,
            (SELECT COUNT(*) FROM produit p WHERE p.id_marque = m.id_marque) AS nb_produits
     FROM marque m
     ORDER BY m.nom ASC`
  );
  return rows;
}

async function getById(id) {
  const [rows] = await pool.query(
    'SELECT id_marque, nom, description FROM marque WHERE id_marque = ?',
    [id]
  );
  return rows[0] || null;
}

async function findByNom(nom) {
  const [rows] = await pool.query(
    'SELECT id_marque FROM marque WHERE LOWER(TRIM(nom)) = LOWER(TRIM(?)) LIMIT 1',
    [nom]
  );
  return rows[0] || null;
}

async function create({ nom, description }) {
  const [result] = await pool.query(
    'INSERT INTO marque (nom, description) VALUES (?, ?)',
    [nom, description || null]
  );
  const id =
    result.insertId ??
    result[0]?.id_marque ??
    result.rows?.[0]?.id_marque;
  return Number(id);
}

async function countProduits(idMarque) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS n FROM produit WHERE id_marque = ?',
    [idMarque]
  );
  return Number(rows[0]?.n || 0);
}

async function remove(id) {
  const [r] = await pool.query('DELETE FROM marque WHERE id_marque = ?', [id]);
  return Number(r.affectedRows ?? r.rowCount ?? 0);
}

module.exports = {
  listMarques,
  getById,
  findByNom,
  create,
  countProduits,
  remove,
};
