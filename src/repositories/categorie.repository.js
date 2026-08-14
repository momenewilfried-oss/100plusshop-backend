const pool = require('../config/database');

async function listCategories() {
  const [rows] = await pool.query(
    'SELECT id_categorie, nom, description FROM categorie ORDER BY nom ASC'
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

module.exports = { listCategories, getById, findByNom, create };
