/**
 * Crée (ou met à jour) un compte administrateur.
 * Usage:
 *   node scripts/create-admin.js admin@boutique.local 'MotDePasseFort123' Nom Prenom
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function main() {
  const [email, password, nom = 'Admin', prenom = 'Boutique'] = process.argv.slice(2);

  if (!email || !password) {
    console.error('Usage: node scripts/create-admin.js <email> <motDePasse> [nom] [prenom]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Mot de passe trop court (min. 8 caractères)');
    process.exit(1);
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || '100plusshop_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    const [roles] = await pool.query(
      `SELECT id_role FROM role WHERE LOWER(libelle) IN ('administrateur', 'admin') LIMIT 1`
    );
    if (roles.length === 0) {
      console.error('Rôle administrateur introuvable dans la table role.');
      process.exit(1);
    }

    const idRole = roles[0].id_role;
    const emailNorm = String(email).trim().toLowerCase();
    const hash = await bcrypt.hash(password, 12);

    const [exists] = await pool.query(
      'SELECT id_utilisateur FROM utilisateur WHERE email = ?',
      [emailNorm]
    );

    if (exists.length > 0) {
      await pool.query(
        `UPDATE utilisateur SET mot_de_passe = ?, id_role = ?, statut = 'actif', nom = ?, prenom = ?
         WHERE email = ?`,
        [hash, idRole, nom, prenom, emailNorm]
      );
      console.log(`✅ Admin mis à jour: ${emailNorm}`);
    } else {
      await pool.query(
        `INSERT INTO utilisateur (nom, prenom, email, telephone, mot_de_passe, id_role, statut)
         VALUES (?, ?, ?, NULL, ?, ?, 'actif')`,
        [nom, prenom, emailNorm, hash, idRole]
      );
      console.log(`✅ Admin créé: ${emailNorm}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Erreur:', e.message);
  process.exit(1);
});
