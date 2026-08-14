const pool = require('../config/database');

async function listMarques() {
  const [rows] = await pool.query(
    'SELECT id_marque, nom, description FROM marque ORDER BY nom ASC'
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

module.exports = { listMarques, getById, findByNom, create };
