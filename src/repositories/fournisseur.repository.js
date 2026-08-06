const pool = require('../config/database');

async function listFournisseurs() {
  const [rows] = await pool.query('SELECT * FROM fournisseur ORDER BY nom');
  return rows;
}

async function getFournisseurById(id) {
  const [rows] = await pool.query('SELECT * FROM fournisseur WHERE id_fournisseur = ?', [id]);
  return rows[0] || null;
}

async function createFournisseur({ nom, contact, email, telephone, adresse }) {
  const [r] = await pool.query(
    `INSERT INTO fournisseur (nom, contact, email, telephone, adresse)
     VALUES (?, ?, ?, ?, ?)`,
    [nom, contact || null, email || null, telephone || null, adresse || null]
  );
  return r.insertId;
}

async function updateFournisseur(id, { nom, contact, email, telephone, adresse }) {
  await pool.query(
    `UPDATE fournisseur SET
       nom = COALESCE(?, nom),
       contact = COALESCE(?, contact),
       email = COALESCE(?, email),
       telephone = COALESCE(?, telephone),
       adresse = COALESCE(?, adresse)
     WHERE id_fournisseur = ?`,
    [nom, contact, email, telephone, adresse, id]
  );
}

async function deleteFournisseur(id) {
  const [r] = await pool.query('DELETE FROM fournisseur WHERE id_fournisseur = ?', [id]);
  return r.affectedRows;
}

module.exports = {
  listFournisseurs,
  getFournisseurById,
  createFournisseur,
  updateFournisseur,
  deleteFournisseur,
};
