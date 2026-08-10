const pool = require('../config/database');

async function listFournisseurs() {
  const [rows] = await pool.query('SELECT * FROM fournisseur ORDER BY nom');
  return rows;
}

async function getFournisseurById(id) {
  const [rows] = await pool.query(
    'SELECT * FROM fournisseur WHERE id_fournisseur = ?',
    [id]
  );
  return rows[0] || null;
}

async function findByEmail(email, excludeId = null) {
  if (!email) return null;
  let sql = 'SELECT * FROM fournisseur WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))';
  const params = [email];
  if (excludeId) {
    sql += ' AND id_fournisseur <> ?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';
  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}

async function findByTelephone(telephone, excludeId = null) {
  if (!telephone) return null;
  // Compare en ne gardant que les chiffres
  let sql = `SELECT * FROM fournisseur
    WHERE regexp_replace(COALESCE(telephone, ''), '[^0-9]', '', 'g')
        = regexp_replace(?, '[^0-9]', '', 'g')`;
  const params = [telephone];
  if (excludeId) {
    sql += ' AND id_fournisseur <> ?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';
  try {
    const [rows] = await pool.query(sql, params);
    return rows[0] || null;
  } catch {
    // Fallback MySQL (sans regexp_replace PG)
    const [rows] = await pool.query(
      excludeId
        ? 'SELECT * FROM fournisseur WHERE telephone = ? AND id_fournisseur <> ? LIMIT 1'
        : 'SELECT * FROM fournisseur WHERE telephone = ? LIMIT 1',
      excludeId ? [telephone, excludeId] : [telephone]
    );
    return rows[0] || null;
  }
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
  const [r] = await pool.query(
    'DELETE FROM fournisseur WHERE id_fournisseur = ?',
    [id]
  );
  return r.affectedRows;
}

module.exports = {
  listFournisseurs,
  getFournisseurById,
  findByEmail,
  findByTelephone,
  createFournisseur,
  updateFournisseur,
  deleteFournisseur,
};