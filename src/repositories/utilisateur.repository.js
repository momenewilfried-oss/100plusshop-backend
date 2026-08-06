const pool = require('../config/database');

async function listUsers() {
  const [rows] = await pool.query(`
    SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.telephone,
           u.statut, u.id_role, r.libelle AS role
    FROM utilisateur u
    LEFT JOIN role r ON u.id_role = r.id_role
    WHERE u.statut IS NULL OR u.statut <> 'supprime'
    ORDER BY u.id_utilisateur DESC
  `);
  return rows;
}

async function getUserById(id) {
  const [rows] = await pool.query(
    `
    SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.telephone,
           u.statut, u.id_role, r.libelle AS role
    FROM utilisateur u
    LEFT JOIN role r ON u.id_role = r.id_role
    WHERE u.id_utilisateur = ?
      AND (u.statut IS NULL OR u.statut <> 'supprime')
  `,
    [id]
  );
  return rows[0] || null;
}

async function existsEmail(email) {
  const [rows] = await pool.query(
    `SELECT id_utilisateur FROM utilisateur
     WHERE email = ? AND (statut IS NULL OR statut <> 'supprime')`,
    [email]
  );
  return rows.length > 0;
}

async function createUser({ nom, prenom, email, telephone, motDePasseHash, idRole }) {
  const [result] = await pool.query(
    `INSERT INTO utilisateur (nom, prenom, email, telephone, mot_de_passe, id_role, statut)
     VALUES (?, ?, ?, ?, ?, ?, 'actif')`,
    [nom, prenom, email, telephone, motDePasseHash, idRole]
  );
  return result.insertId;
}

async function updateUser({ id, nom, prenom, telephone, idRole, statut }) {
  await pool.query(
    `UPDATE utilisateur SET
       nom = COALESCE(?, nom),
       prenom = COALESCE(?, prenom),
       telephone = COALESCE(?, telephone),
       id_role = COALESCE(?, id_role),
       statut = COALESCE(?, statut)
     WHERE id_utilisateur = ? AND (statut IS NULL OR statut <> 'supprime')`,
    [nom, prenom, telephone, idRole, statut, id]
  );
}

async function updateUserPassword(id, motDePasseHash) {
  await pool.query(
    `UPDATE utilisateur SET mot_de_passe = ? WHERE id_utilisateur = ?`,
    [motDePasseHash, id]
  );
}

/** Soft delete : statut = 'supprime' (plus de DELETE physique) */
async function deleteUser(id) {
  const [result] = await pool.query(
    `UPDATE utilisateur SET statut = 'supprime' WHERE id_utilisateur = ? AND statut <> 'supprime'`,
    [id]
  );
  return result.affectedRows;
}

async function listRoles() {
  const [rows] = await pool.query('SELECT * FROM role ORDER BY id_role');
  return rows;
}

module.exports = {
  listUsers,
  getUserById,
  existsEmail,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
  listRoles,
};