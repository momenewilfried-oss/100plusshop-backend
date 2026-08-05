const pool = require('../config/database');

async function listerFournisseurs(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM fournisseur ORDER BY nom');
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  }
}

async function obtenirFournisseur(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM fournisseur WHERE id_fournisseur = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Fournisseur introuvable' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  }
}

async function creerFournisseur(req, res) {
  try {
    const { nom, contact, email, telephone, adresse } = req.body || {};
    if (!nom) return res.status(400).json({ message: 'nom obligatoire' });

    const [r] = await pool.query(
      `INSERT INTO fournisseur (nom, contact, email, telephone, adresse)
       VALUES (?, ?, ?, ?, ?)`,
      [nom, contact || null, email || null, telephone || null, adresse || null]
    );
    const [row] = await pool.query(
      'SELECT * FROM fournisseur WHERE id_fournisseur = ?',
      [r.insertId]
    );
    res.status(201).json(row[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  }
}

async function modifierFournisseur(req, res) {
  try {
    const { id } = req.params;
    const { nom, contact, email, telephone, adresse } = req.body || {};
    const [ex] = await pool.query(
      'SELECT id_fournisseur FROM fournisseur WHERE id_fournisseur = ?',
      [id]
    );
    if (ex.length === 0) return res.status(404).json({ message: 'Fournisseur introuvable' });

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
    const [row] = await pool.query(
      'SELECT * FROM fournisseur WHERE id_fournisseur = ?',
      [id]
    );
    res.json(row[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  }
}

async function supprimerFournisseur(req, res) {
  try {
    const [r] = await pool.query(
      'DELETE FROM fournisseur WHERE id_fournisseur = ?',
      [req.params.id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ message: 'Fournisseur introuvable' });
    res.json({ message: 'Fournisseur supprimé' });
  } catch (e) {
    console.error(e);
    if (e.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ message: 'Impossible : des achats sont liés à ce fournisseur' });
    }
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  }
}

module.exports = {
  listerFournisseurs,
  obtenirFournisseur,
  creerFournisseur,
  modifierFournisseur,
  supprimerFournisseur,
};