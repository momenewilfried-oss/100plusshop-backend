const { ApiError } = require('../utils/error-handler');
const pool = require('../config/database');
const {
  assertPourcentage,
  assertMontantPromo,
} = require('../utils/validators');

async function listPromotions() {
  try {
    const [rows] = await pool.query(`
      SELECT id_promotion, nom, type, valeur, date_debut, date_fin, statut
      FROM promotion
      ORDER BY date_debut DESC
    `);
    return rows;
  } catch (e) {
    // fallback camelCase
    const [rows] = await pool.query(`
      SELECT idPromotion AS id_promotion, nom, type, valeur,
             dateDebut AS date_debut, dateFin AS date_fin, statut
      FROM promotion
      ORDER BY dateDebut DESC
    `);
    return rows;
  }
}

async function getPromotion(id) {
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
  if (rows.length === 0) return null;
  const promo = rows[0];
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
  return { ...promo, variantes };
}

async function createPromotion({ nom, type, valeur: valeurIn, dateDebut, dateFin, date_debut, date_fin, statut, variantes } = {}) {
  let valeur = valeurIn;
  const dDebut = date_debut || dateDebut;
  const dFin = date_fin || dateFin;
  if (!nom || !type || valeur == null || !dDebut || !dFin) {
    throw new ApiError(400, 'nom, type, valeur, dateDebut/date_debut, dateFin/date_fin obligatoires');
  }
  if (!['pourcentage', 'montant'].includes(String(type))) {
    throw new ApiError(400, 'type doit être « pourcentage » ou « montant »');
  }
  if (String(type) === 'pourcentage') {
    valeur = assertPourcentage(valeur, ApiError);
  } else {
    valeur = assertMontantPromo(valeur, ApiError);
  }
  if (new Date(dFin) < new Date(dDebut)) {
    throw new ApiError(400, 'La date de fin doit être postérieure à la date de début');
  }
  const db = await pool.getConnection();
  try {
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
          await db.query('INSERT INTO variante_promotion (id_variante, id_promotion) VALUES (?, ?)', [idVar, insertId]);
        } catch {
          await db.query('INSERT INTO variante_promotion (variante, promotion) VALUES (?, ?)', [idVar, insertId]);
        }
      }
    }
    await db.commit();
    // Schéma réel = id_promotion / date_debut / date_fin
    try {
      const [row] = await pool.query(
        'SELECT id_promotion, nom, type, valeur, date_debut, date_fin, statut FROM promotion WHERE id_promotion = ?',
        [insertId]
      );
      return row[0] || { id_promotion: insertId, nom, type, valeur, date_debut: dDebut, date_fin: dFin, statut: statut || 'active' };
    } catch {
      return { id_promotion: insertId, nom, type, valeur, date_debut: dDebut, date_fin: dFin, statut: statut || 'active' };
    }
  } catch (e) {
    await db.rollback();
    throw e;
  } finally {
    db.release();
  }
}

async function updatePromotion(id, { nom, type, valeur: valeurIn, dateDebut, dateFin, date_debut, date_fin, statut } = {}) {
  let valeur = valeurIn;
  const dDebut = date_debut || dateDebut;
  const dFin = date_fin || dateFin;
  if (valeur != null && type === 'pourcentage') {
    valeur = assertPourcentage(valeur, ApiError);
  } else if (valeur != null && type === 'montant') {
    valeur = assertMontantPromo(valeur, ApiError);
  } else if (valeur != null && !type) {
    // type inconnu : plafonner si > 100 (probablement un %)
    const v = Number(valeur);
    if (!Number.isNaN(v) && v > 100) {
      throw new ApiError(400, 'La valeur de promotion ne peut pas dépasser 100 pour un pourcentage');
    }
  }
  if (dDebut && dFin && new Date(dFin) < new Date(dDebut)) {
    throw new ApiError(400, 'La date de fin doit être postérieure à la date de début');
  }
  try {
    const [ex] = await pool.query('SELECT id_promotion FROM promotion WHERE id_promotion = ?', [id]);
    if (ex.length === 0) throw new ApiError(404, 'Promotion introuvable');
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
    const [ex] = await pool.query('SELECT idPromotion FROM promotion WHERE idPromotion = ?', [id]);
    if (ex.length === 0) throw new ApiError(404, 'Promotion introuvable');
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
  const [row] = await pool.query('SELECT * FROM promotion WHERE id_promotion = ? OR idPromotion = ? LIMIT 1', [id, id]).catch(() => pool.query('SELECT * FROM promotion WHERE idPromotion = ?', [id]));
  return row[0];
}

async function deletePromotion(id) {
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    try {
      await db.query('DELETE FROM variante_promotion WHERE id_promotion = ?', [id]);
      const [r] = await db.query('DELETE FROM promotion WHERE id_promotion = ?', [id]);
      await db.commit();
      if (r.affectedRows === 0) throw new ApiError(404, 'Promotion introuvable');
    } catch {
      await db.query('DELETE FROM variante_promotion WHERE promotion = ?', [id]);
      const [r] = await db.query('DELETE FROM promotion WHERE idPromotion = ?', [id]);
      await db.commit();
      if (r.affectedRows === 0) throw new ApiError(404, 'Promotion introuvable');
    }
    return { message: 'Promotion supprimée' };
  } catch (e) {
    await db.rollback();
    throw e;
  } finally {
    db.release();
  }
}

async function promoForVariant(idVariante) {
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
    return rows[0] || null;
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
    return rows[0] || null;
  }
}

module.exports = {
  listPromotions,
  getPromotion,
  createPromotion,
  updatePromotion,
  deletePromotion,
  promoForVariant,
};