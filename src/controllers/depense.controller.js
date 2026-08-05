const pool = require('../config/database');

async function listerDepenses(req, res) {
  try {
    const { debut, fin, categorie } = req.query;
    let sql = `
      SELECT d.*, u.nom AS user_nom, u.prenom AS user_prenom
      FROM depense d
      LEFT JOIN utilisateur u ON d.id_enregistre_par = u.id_utilisateur
      WHERE 1=1
    `;
    const params = [];

    if (debut) { sql += ' AND DATE(d.date_depense) >= ?'; params.push(debut); }
    if (fin) { sql += ' AND DATE(d.date_depense) <= ?'; params.push(fin); }
    if (categorie) { sql += ' AND d.categorie = ?'; params.push(categorie); }
    sql += ' ORDER BY d.date_depense DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  }
}

async function creerDepense(req, res) {
  try {
    const { libelle, categorie, montant, dateDepense } = req.body || {};

    if (!libelle || montant == null) {
      return res.status(400).json({ message: 'libelle et montant obligatoires' });
    }
    if (Number(montant) <= 0) {
      return res.status(400).json({ message: 'Le montant doit être positif' });
    }

    const [r] = await pool.query(
      `INSERT INTO depense (libelle, categorie, montant, date_depense, id_enregistre_par)
       VALUES (?, ?, ?, COALESCE(?, NOW()), ?)`,
      [
        libelle,
        categorie || 'autre',
        montant,
        dateDepense || null,
        req.utilisateur?.id || null,
      ]
    );

    const [row] = await pool.query('SELECT * FROM depense WHERE id_depense = ?', [r.insertId]);
    res.status(201).json(row[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  }
}

async function modifierDepense(req, res) {
  try {
    const { id } = req.params;
    const { libelle, categorie, montant, dateDepense } = req.body || {};

    const [ex] = await pool.query('SELECT id_depense FROM depense WHERE id_depense = ?', [id]);
    if (ex.length === 0) return res.status(404).json({ message: 'Dépense introuvable' });

    await pool.query(
      `UPDATE depense SET
         libelle = COALESCE(?, libelle),
         categorie = COALESCE(?, categorie),
         montant = COALESCE(?, montant),
         date_depense = COALESCE(?, date_depense)
       WHERE id_depense = ?`,
      [libelle, categorie, montant, dateDepense, id]
    );

    const [row] = await pool.query('SELECT * FROM depense WHERE id_depense = ?', [id]);
    res.json(row[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  }
}

async function supprimerDepense(req, res) {
  try {
    const [r] = await pool.query('DELETE FROM depense WHERE id_depense = ?', [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: 'Dépense introuvable' });
    res.json({ message: 'Dépense supprimée' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  }
}

module.exports = { listerDepenses, creerDepense, modifierDepense, supprimerDepense };