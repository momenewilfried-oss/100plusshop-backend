const pool = require('../config/database');

async function listCategories() {
  const [rows] = await pool.query(
    `SELECT c.id_categorie, c.nom, c.description,
            (SELECT COUNT(*) FROM produit p WHERE p.id_categorie = c.id_categorie) AS nb_produits
     FROM categorie c
     ORDER BY c.nom ASC`
  );
  return rows;
}

async function getById(id) {
  const [rows] = await pool.query(
    'SELECT id_categorie, nom, description FROM categorie WHERE id_categorie = ?',
    [id]
  );
  return rows[0] || null;
}

async function findByNom(nom) {
  const [rows] = await pool.query(
    'SELECT id_categorie FROM categorie WHERE LOWER(TRIM(nom)) = LOWER(TRIM(?)) LIMIT 1',
    [nom]
  );
  return rows[0] || null;
}

async function create({ nom, description }) {
  const [result] = await pool.query(
    'INSERT INTO categorie (nom, description) VALUES (?, ?)',
    [nom, description || null]
  );
  const id =
    result.insertId ??
    result[0]?.id_categorie ??
    result.rows?.[0]?.id_categorie;
  return Number(id);
}

async function countProduits(idCategorie) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS n FROM produit WHERE id_categorie = ?',
    [idCategorie]
  );
  return Number(rows[0]?.n || 0);
}

async function remove(id) {
  const [r] = await pool.query(
    'DELETE FROM categorie WHERE id_categorie = ?',
    [id]
  );
  return Number(r.affectedRows ?? r.rowCount ?? 0);
}

module.exports = {
  listCategories,
  getById,
  findByNom,
  create,
  countProduits,
  remove,
};
