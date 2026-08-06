const pool = require('../config/database');

async function findUserByEmail(email) {
  const [rows] = await pool.query(
    `SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.mot_de_passe,
            u.id_role, u.statut, r.libelle AS role_libelle
     FROM utilisateur u
     JOIN role r ON u.id_role = r.id_role
     WHERE u.email = ?`,
    [email]
  );
  return rows;
}

async function findRoleByLabels(labels) {
  const placeholders = labels.map(() => '?').join(', ');
  const [rows] = await pool.query(
    `SELECT id_role FROM role WHERE LOWER(libelle) IN (${placeholders}) LIMIT 1`,
    labels
  );
  return rows;
}

async function countAdmins() {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS n
     FROM utilisateur u
     JOIN role r ON u.id_role = r.id_role
     WHERE LOWER(r.libelle) IN ('administrateur', 'admin')`
  );
  return Number(rows[0]?.n || 0);
}

async function findUserByEmailExists(email) {
  const [rows] = await pool.query(
    'SELECT id_utilisateur FROM utilisateur WHERE email = ?',
    [email]
  );
  return rows.length > 0;
}

async function insertUser({ nom, prenom, email, telephone, motDePasseHash, idRole }) {
  const [result] = await pool.query(
    `INSERT INTO utilisateur
     (nom, prenom, email, telephone, mot_de_passe, id_role, statut)
     VALUES (?, ?, ?, ?, ?, ?, 'actif')`,
    [nom, prenom, email, telephone, motDePasseHash, idRole]
  );
  return result.insertId;
}

async function getUserByIdWithRole(id) {
  const [rows] = await pool.query(
    `SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.id_role, r.libelle AS role
     FROM utilisateur u
     LEFT JOIN role r ON u.id_role = r.id_role
     WHERE u.id_utilisateur = ?`,
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  findUserByEmail,
  findRoleByLabels,
  countAdmins,
  findUserByEmailExists,
  insertUser,
  getUserByIdWithRole,
};