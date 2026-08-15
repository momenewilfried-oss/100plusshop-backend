const pool = require('../config/database');

async function listClients() {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM client
       WHERE deleted_at IS NULL
       ORDER BY id_client DESC`
    );
    return rows;
  } catch {
    const [rows] = await pool.query(`SELECT * FROM client ORDER BY id_client DESC`);
    return rows;
  }
}

async function getClientById(id) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM client WHERE id_client = ? AND deleted_at IS NULL`,
      [id]
    );
    return rows[0] || null;
  } catch {
    const [rows] = await pool.query(`SELECT * FROM client WHERE id_client = ?`, [id]);
    return rows[0] || null;
  }
}

async function createClient({ nom, prenom, telephone, email }) {
  const [result] = await pool.query(
    `INSERT INTO client (nom, prenom, telephone, email, date_creation)
     VALUES (?, ?, ?, ?, NOW())`,
    [nom || null, prenom || null, telephone || null, email || null]
  );
  return result.insertId;
}

async function updateClient(id, { nom, prenom, telephone, email }) {
  await pool.query(
    `UPDATE client SET
       nom = COALESCE(?, nom),
       prenom = COALESCE(?, prenom),
       telephone = COALESCE(?, telephone),
       email = COALESCE(?, email)
     WHERE id_client = ?`,
    [nom, prenom, telephone, email, id]
  );
}

/** Soft delete si colonne deleted_at présente, sinon DELETE physique (fallback) */
async function deleteClient(id) {
  try {
    const [result] = await pool.query(
      `UPDATE client SET deleted_at = NOW() WHERE id_client = ? AND deleted_at IS NULL`,
      [id]
    );
    if (result.affectedRows > 0) return result.affectedRows;
    // colonne absente → erreur catch
  } catch {
    /* fallback */
  }
  const [result] = await pool.query('DELETE FROM client WHERE id_client = ?', [id]);
  return result.affectedRows;
}


async function findByEmail(email, excludeId = null) {
  if (!email) return null;
  let sql = 'SELECT * FROM client WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))';
  const params = [email];
  if (excludeId) {
    sql += ' AND id_client <> ?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';
  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}

async function findByTelephone(telephone, excludeId = null) {
  if (!telephone) return null;
  let sql = `SELECT * FROM client
    WHERE regexp_replace(COALESCE(telephone, ''), '[^0-9]', '', 'g')
        = regexp_replace(?, '[^0-9]', '', 'g')`;
  const params = [telephone];
  if (excludeId) {
    sql += ' AND id_client <> ?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';
  try {
    const [rows] = await pool.query(sql, params);
    return rows[0] || null;
  } catch {
    const [rows] = await pool.query(
      excludeId
        ? 'SELECT * FROM client WHERE telephone = ? AND id_client <> ? LIMIT 1'
        : 'SELECT * FROM client WHERE telephone = ? LIMIT 1',
      excludeId ? [telephone, excludeId] : [telephone]
    );
    return rows[0] || null;
  }
}

async function findByNomPrenom(nom, prenom, excludeId = null) {
  const n = String(nom || '').trim();
  const p = String(prenom || '').trim();
  if (!n && !p) return null;
  let sql = `SELECT * FROM client
    WHERE LOWER(TRIM(COALESCE(nom, ''))) = LOWER(TRIM(?))
      AND LOWER(TRIM(COALESCE(prenom, ''))) = LOWER(TRIM(?))`;
  const params = [n, p];
  if (excludeId) {
    sql += ' AND id_client <> ?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';
  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}

module.exports = {
  findByEmail,
  findByTelephone,
  findByNomPrenom,
  listClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
};
