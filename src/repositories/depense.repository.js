const pool = require('../config/database');

async function listDepenses({ debut, fin, categorie } = {}) {
  let sql = `
    SELECT d.*, u.nom AS user_nom, u.prenom AS user_prenom
    FROM depense d
    LEFT JOIN utilisateur u ON d.id_enregistre_par = u.id_utilisateur
    WHERE 1=1
  `;
  const params = [];
  if (debut) {
    sql += ' AND DATE(d.date_depense) >= ?';
    params.push(debut);
  }
  if (fin) {
    sql += ' AND DATE(d.date_depense) <= ?';
    params.push(fin);
  }
  if (categorie) {
    sql += ' AND d.categorie = ?';
    params.push(categorie);
  }
  sql += ' ORDER BY d.date_depense DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

/**
 * Vérifie si un libellé existe déjà (insensible à la casse).
 * @param {string} libelle
 * @param {number|null} excludeId - id_depense à ignorer (pour UPDATE)
 */
async function existsLibelleIgnoreCase(libelle, excludeId = null) {
  const nom = String(libelle || '').trim();
  if (!nom) return false;
  let sql = `
    SELECT id_depense FROM depense
    WHERE LOWER(TRIM(libelle)) = LOWER(TRIM(?))
  `;
  const params = [nom];
  if (excludeId != null) {
    sql += ' AND id_depense <> ?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';
  const [rows] = await pool.query(sql, params);
  return Array.isArray(rows) && rows.length > 0;
}

async function createDepense({ libelle, categorie, montant, dateDepense, idUtilisateur }) {
  let dateVal = dateDepense || null;
  if (dateVal && typeof dateVal === 'string') {
    dateVal = dateVal.trim().replace('T', ' ');
    if (!dateVal) dateVal = null;
  }

  const [r] = await pool.query(
    `INSERT INTO depense (libelle, categorie, montant, date_depense, id_enregistre_par)
     VALUES (?, ?, ?, COALESCE(?, NOW()), ?)`,
    [libelle, categorie || 'autre', montant, dateVal, idUtilisateur || null]
  );

  const id =
    r?.insertId ??
    r?.[0]?.id_depense ??
    r?.rows?.[0]?.id_depense ??
    null;

  if (id == null || Number(id) <= 0) {
    throw new Error('INSERT depense: id_depense non retourné');
  }
  return Number(id);
}

async function getDepenseById(id) {
  const [rows] = await pool.query('SELECT * FROM depense WHERE id_depense = ?', [id]);
  return rows[0] || null;
}

async function updateDepense(id, { libelle, categorie, montant, dateDepense }) {
  let dateVal = dateDepense;
  if (dateVal && typeof dateVal === 'string') {
    dateVal = dateVal.trim().replace('T', ' ');
    if (!dateVal) dateVal = null;
  }
  const [r] = await pool.query(
    `UPDATE depense SET
       libelle = COALESCE(?, libelle),
       categorie = COALESCE(?, categorie),
       montant = COALESCE(?, montant),
       date_depense = COALESCE(?, date_depense)
     WHERE id_depense = ?`,
    [libelle, categorie, montant, dateVal, id]
  );
  return r.affectedRows;
}

async function deleteDepense(id) {
  const [r] = await pool.query('DELETE FROM depense WHERE id_depense = ?', [id]);
  return r.affectedRows;
}

module.exports = {
  listDepenses,
  existsLibelleIgnoreCase,
  createDepense,
  getDepenseById,
  updateDepense,
  deleteDepense,
};
