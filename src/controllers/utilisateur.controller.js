const bcrypt = require('bcrypt');
const pool = require('../config/database');

async function listerUtilisateurs(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.telephone,
             u.statut, u.id_role, r.libelle AS role
      FROM utilisateur u
      LEFT JOIN role r ON u.id_role = r.id_role
      ORDER BY u.id_utilisateur DESC
    `);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  }
}

async function obtenirUtilisateur(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.telephone,
             u.statut, u.id_role, r.libelle AS role
      FROM utilisateur u
      LEFT JOIN role r ON u.id_role = r.id_role
      WHERE u.id_utilisateur = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  }
}

async function creerUtilisateur(req, res) {
  try {
    const { nom, prenom, email, telephone, motDePasse, idRole } = req.body || {};

    if (!nom || !prenom || !email || !motDePasse || !idRole) {
      return res.status(400).json({ message: 'nom, prenom, email, motDePasse et idRole obligatoires' });
    }

    const [existe] = await pool.query('SELECT id_utilisateur FROM utilisateur WHERE email = ?', [email]);
    if (existe.length > 0) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé' });
    }

    const hash = await bcrypt.hash(motDePasse, 12);
    const [result] = await pool.query(
      `INSERT INTO utilisateur (nom, prenom, email, telephone, mot_de_passe, id_role, statut)
       VALUES (?, ?, ?, ?, ?, ?, 'actif')`,
      [nom, prenom, email, telephone || null, hash, idRole]
    );

    const [user] = await pool.query(`
      SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.telephone, u.statut, r.libelle AS role
      FROM utilisateur u
      LEFT JOIN role r ON u.id_role = r.id_role
      WHERE u.id_utilisateur = ?
    `, [result.insertId]);

    res.status(201).json(user[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  }
}

async function modifierUtilisateur(req, res) {
  try {
    const { id } = req.params;
    const { nom, prenom, telephone, idRole, statut, motDePasse } = req.body || {};

    const [existe] = await pool.query('SELECT id_utilisateur FROM utilisateur WHERE id_utilisateur = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    await pool.query(
      `UPDATE utilisateur SET
         nom = COALESCE(?, nom),
         prenom = COALESCE(?, prenom),
         telephone = COALESCE(?, telephone),
         id_role = COALESCE(?, id_role),
         statut = COALESCE(?, statut)
       WHERE id_utilisateur = ?`,
      [nom, prenom, telephone, idRole, statut, id]
    );

    if (motDePasse) {
      const hash = await bcrypt.hash(motDePasse, 12);
      await pool.query('UPDATE utilisateur SET mot_de_passe = ? WHERE id_utilisateur = ?', [hash, id]);
    }

    const [user] = await pool.query(`
      SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.telephone, u.statut, r.libelle AS role
      FROM utilisateur u
      LEFT JOIN role r ON u.id_role = r.id_role
      WHERE u.id_utilisateur = ?
    `, [id]);

    res.json(user[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  }
}

async function supprimerUtilisateur(req, res) {
  try {
    const { id } = req.params;

    if (Number(id) === Number(req.utilisateur.id)) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    const [result] = await pool.query('DELETE FROM utilisateur WHERE id_utilisateur = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }
    res.json({ message: 'Utilisateur supprimé' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  }
}

async function listerRoles(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM role ORDER BY id_role');
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  }
}

module.exports = {
  listerUtilisateurs,
  obtenirUtilisateur,
  creerUtilisateur,
  modifierUtilisateur,
  supprimerUtilisateur,
  listerRoles
};