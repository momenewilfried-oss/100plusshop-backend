const pool = require('../config/database');

async function listerPromotions(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT id_promotion, nom, type, valeur, date_debut, date_fin, statut
      FROM promotion
      ORDER BY date_debut DESC
    `);
    res.json(rows);
  } catch (e) {
    // Fallback si la table est encore en camelCase
    try {
      const [rows] = await pool.query(`
        SELECT idPromotion AS id_promotion, nom, type, valeur,
               dateDebut AS date_debut, dateFin AS date_fin, statut
        FROM promotion
        ORDER BY dateDebut DESC
      `);
      return res.json(rows);
    } catch (e2) {
      console.error(e2);
      return res.status(500).json({ message: 'Erreur serveur', erreur: e2.message });
    }
  }
}

async function obtenirPromotion(req, res) {
  try {
    const { id } = req.params;
    let rows;
    try {
      [rows] = await pool.query(
        'SELECT id_promotion, nom, type, valeur, date_debut, date_fin, statut FROM promotion WHERE id_promotion = ?',
        [id]
      );
    } catch {
      [rows] = await pool.query(
        `SELECT idPromotion AS id_promotion, nom, type, valeur,
                dateDebut AS date_debut, dateFin AS date_fin, statut
         FROM promotion WHERE idPromotion = ?`,
        [id]
      );
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Promotion introuvable' });
    }

    let variantes = [];
    try {
      const [v] = await pool.query(
        `SELECT vp.id_variante, p.nom AS produit_nom, v.taille, v.couleur
         FROM variante_promotion vp
         JOIN variante v ON v.id_variante = vp.id_variante
         JOIN produit p ON p.id_produit = v.id_produit
         WHERE vp.id_promotion = ?`,
        [id]
      );
      variantes = v;
    } catch {
      const [v] = await pool.query(
        `SELECT vp.variante AS id_variante, p.nom AS produit_nom, v.taille, v.couleur
         FROM variante_promotion vp
         JOIN variante v ON v.id_variante = vp.variante
         JOIN produit p ON p.id_produit = v.id_produit
         WHERE vp.promotion = ?`,
        [id]
      );
      variantes = v;
    }

    res.json({ ...rows[0], variantes });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  }
}

async function creerPromotion(req, res) {
  const db = await pool.getConnection();
  try {
    const { nom, type, valeur, dateDebut, dateFin, date_debut, date_fin, statut, variantes } =
      req.body || {};

    const dDebut = date_debut || dateDebut;
    const dFin = date_fin || dateFin;

    if (!nom || !type || valeur == null || !dDebut || !dFin) {
      db.release();
      return res.status(400).json({
        message: 'nom, type, valeur, dateDebut/date_debut, dateFin/date_fin obligatoires',
      });
    }

    if (!['pourcentage', 'montant'].includes(String(type))) {
      db.release();
      return res.status(400).json({ message: 'type doit être « pourcentage » ou « montant »' });
    }

    await db.beginTransaction();

    let insertId;
    try {
      const [r] = await db.query(
        `INSERT INTO promotion (nom, type, valeur, date_debut, date_fin, statut)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nom, type, valeur, dDebut, dFin, statut || 'active']
      );
      insertId = r.insertId;
    } catch {
      const [r] = await db.query(
        `INSERT INTO promotion (nom, type, valeur, dateDebut, dateFin, statut)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nom, type, valeur, dDebut, dFin, statut || 'active']
      );
      insertId = r.insertId;
    }

    if (Array.isArray(variantes) && variantes.length > 0) {
      for (const idVar of variantes) {
        try {
          await db.query(
            'INSERT INTO variante_promotion (id_variante, id_promotion) VALUES (?, ?)',
            [idVar, insertId]
          );
        } catch {
          await db.query(
            'INSERT INTO variante_promotion (variante, promotion) VALUES (?, ?)',
            [idVar, insertId]
          );
        }
      }
    }

    await db.commit();

    const [row] = await db.query(
      'SELECT * FROM promotion WHERE id_promotion = ? OR idPromotion = ?',
      [insertId, insertId]
    ).catch(() => db.query('SELECT * FROM promotion WHERE idPromotion = ?', [insertId]));

    res.status(201).json(row[0] || { id_promotion: insertId, nom, type, valeur });
  } catch (e) {
    await db.rollback();
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  } finally {
    db.release();
  }
}

async function modifierPromotion(req, res) {
  try {
    const { id } = req.params;
    const { nom, type, valeur, dateDebut, dateFin, date_debut, date_fin, statut } =
      req.body || {};
    const dDebut = date_debut || dateDebut;
    const dFin = date_fin || dateFin;

    try {
      const [ex] = await pool.query(
        'SELECT id_promotion FROM promotion WHERE id_promotion = ?',
        [id]
      );
      if (ex.length === 0) {
        return res.status(404).json({ message: 'Promotion introuvable' });
      }
      await pool.query(
        `UPDATE promotion SET
           nom = COALESCE(?, nom),
           type = COALESCE(?, type),
           valeur = COALESCE(?, valeur),
           date_debut = COALESCE(?, date_debut),
           date_fin = COALESCE(?, date_fin),
           statut = COALESCE(?, statut)
         WHERE id_promotion = ?`,
        [nom, type, valeur, dDebut, dFin, statut, id]
      );
    } catch {
      const [ex] = await pool.query(
        'SELECT idPromotion FROM promotion WHERE idPromotion = ?',
        [id]
      );
      if (ex.length === 0) {
        return res.status(404).json({ message: 'Promotion introuvable' });
      }
      await pool.query(
        `UPDATE promotion SET
           nom = COALESCE(?, nom),
           type = COALESCE(?, type),
           valeur = COALESCE(?, valeur),
           dateDebut = COALESCE(?, dateDebut),
           dateFin = COALESCE(?, dateFin),
           statut = COALESCE(?, statut)
         WHERE idPromotion = ?`,
        [nom, type, valeur, dDebut, dFin, statut, id]
      );
    }

    const [row] = await pool.query(
      'SELECT * FROM promotion WHERE id_promotion = ? OR idPromotion = ? LIMIT 1',
      [id, id]
    ).catch(() => pool.query('SELECT * FROM promotion WHERE idPromotion = ?', [id]));

    res.json(row[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  }
}

async function supprimerPromotion(req, res) {
  const db = await pool.getConnection();
  try {
    const { id } = req.params;
    await db.beginTransaction();

    try {
      await db.query('DELETE FROM variante_promotion WHERE id_promotion = ?', [id]);
      const [r] = await db.query('DELETE FROM promotion WHERE id_promotion = ?', [id]);
      await db.commit();
      if (r.affectedRows === 0) {
        return res.status(404).json({ message: 'Promotion introuvable' });
      }
    } catch {
      await db.query('DELETE FROM variante_promotion WHERE promotion = ?', [id]);
      const [r] = await db.query('DELETE FROM promotion WHERE idPromotion = ?', [id]);
      await db.commit();
      if (r.affectedRows === 0) {
        return res.status(404).json({ message: 'Promotion introuvable' });
      }
    }

    res.json({ message: 'Promotion supprimée' });
  } catch (e) {
    await db.rollback();
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  } finally {
    db.release();
  }
}

async function promoPourVariante(req, res) {
  try {
    const { idVariante } = req.params;
    const now = new Date();

    try {
      const [rows] = await pool.query(
        `SELECT p.id_promotion, p.nom, p.type, p.valeur, p.date_debut, p.date_fin, p.statut
         FROM promotion p
         JOIN variante_promotion vp ON vp.id_promotion = p.id_promotion
         WHERE vp.id_variante = ?
           AND p.statut = 'active'
           AND p.date_debut <= ?
           AND p.date_fin >= ?
         ORDER BY p.valeur DESC
         LIMIT 1`,
        [idVariante, now, now]
      );
      return res.json(rows[0] || null);
    } catch {
      const [rows] = await pool.query(
        `SELECT p.idPromotion AS id_promotion, p.nom, p.type, p.valeur,
                p.dateDebut AS date_debut, p.dateFin AS date_fin, p.statut
         FROM promotion p
         JOIN variante_promotion vp ON vp.promotion = p.idPromotion
         WHERE vp.variante = ?
           AND p.statut = 'active'
           AND p.dateDebut <= ?
           AND p.dateFin >= ?
         ORDER BY p.valeur DESC
         LIMIT 1`,
        [idVariante, now, now]
      );
      return res.json(rows[0] || null);
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  }
}

module.exports = {
  listerPromotions,
  obtenirPromotion,
  creerPromotion,
  modifierPromotion,
  supprimerPromotion,
    promoPourVariante,
};