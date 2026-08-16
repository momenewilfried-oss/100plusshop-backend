const { ApiError } = require('../utils/error-handler');
const pool = require('../config/database');

function genererNumeroAchat() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `ACH-${y}${m}${day}-${rand}`;
}

/** Récupère l'id généré après INSERT (MySQL insertId ou PG RETURNING) */
function extractInsertId(result, ...keys) {
  if (!result) return null;
  if (result.insertId != null && result.insertId !== '') {
    const n = Number(result.insertId);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  const row = Array.isArray(result) ? result[0] : null;
  if (row && typeof row === 'object') {
    for (const k of keys) {
      if (row[k] != null) {
        const n = Number(row[k]);
        if (!Number.isNaN(n) && n > 0) return n;
      }
    }
  }
  return null;
}

async function listAchats() {
  const [rows] = await pool.query(`
    SELECT fa.*, f.nom AS fournisseur_nom
    FROM facture_achat fa
    JOIN fournisseur f ON fa.id_fournisseur = f.id_fournisseur
    ORDER BY fa.date_achat DESC
  `);
  return rows;
}

async function getAchat(id) {
  const [rows] = await pool.query(
    `SELECT fa.*, f.nom AS fournisseur_nom, f.email AS fournisseur_email
     FROM facture_achat fa
     JOIN fournisseur f ON fa.id_fournisseur = f.id_fournisseur
     WHERE fa.id_facture_achat = ?`,
    [id]
  );
  if (rows.length === 0) return null;
  const [details] = await pool.query(
    `SELECT da.*, p.nom AS produit_nom, p.reference, v.taille, v.couleur
     FROM detail_achat da
     JOIN variante v ON da.id_variante = v.id_variante
     JOIN produit p ON v.id_produit = p.id_produit
     WHERE da.id_facture_achat = ?`,
    [id]
  );
  return { ...rows[0], details };
}

async function createAchat({ idFournisseur, lignes, idempotencyKey } = {}) {
  const key = idempotencyKey ? String(idempotencyKey).slice(0, 64) : null;
  if (key) {
    try {
      const [ex] = await pool.query(
        'SELECT * FROM facture_achat WHERE idempotency_key = ? LIMIT 1',
        [key]
      );
      if (ex && ex.length) return { ...ex[0], replay: true };
    } catch (_) {}
  }

  const db = await pool.getConnection();
  try {
    if (!idFournisseur || !lignes || lignes.length === 0) {
      throw new ApiError(400, 'idFournisseur et lignes (non vide) obligatoires');
    }

    await db.beginTransaction();

    if (key) {
      try {
        await db.query('SELECT pg_advisory_xact_lock(hashtext(?))', [key]);
      } catch (_) {}
      try {
        const [ex2] = await db.query(
          'SELECT * FROM facture_achat WHERE idempotency_key = ? LIMIT 1',
          [key]
        );
        if (ex2 && ex2.length) {
          await db.rollback();
          return { ...ex2[0], replay: true };
        }
      } catch (_) {}
    }

    const [four] = await db.query(
      'SELECT id_fournisseur FROM fournisseur WHERE id_fournisseur = ?',
      [idFournisseur]
    );
    if (!four || four.length === 0) {
      throw new ApiError(404, 'Fournisseur introuvable');
    }

    let montantTotal = 0;
    for (const l of lignes) {
      if (!l.idVariante || !l.quantite || l.prixUnitaire == null) {
        throw new ApiError(
          400,
          'Chaque ligne doit avoir idVariante, quantite, prixUnitaire'
        );
      }
      if (Number(l.quantite) <= 0) {
        throw new ApiError(400, 'La quantité doit être supérieure à 0');
      }
      if (Number(l.prixUnitaire) < 0) {
        throw new ApiError(400, 'Le prix unitaire ne peut pas être négatif');
      }
      const [v] = await db.query(
        'SELECT id_variante FROM variante WHERE id_variante = ?',
        [l.idVariante]
      );
      if (!v || v.length === 0) {
        throw new ApiError(404, `Variante ${l.idVariante} introuvable`);
      }
      montantTotal += Number(l.quantite) * Number(l.prixUnitaire);
    }

    // Règle métier : le montant de l'achat ne peut pas dépasser le CA (ventes validées)
    const [caRows] = await db.query(
      `SELECT COALESCE(SUM(montant_total), 0) AS ca
       FROM vente
       WHERE statut = 'validee'`
    );
    const chiffreAffaires = Number(
      (Array.isArray(caRows) && caRows[0] && caRows[0].ca) != null
        ? caRows[0].ca
        : 0
    );
    if (montantTotal > chiffreAffaires) {
      throw new ApiError(
        400,
        `Achat impossible : montant ${montantTotal} FCFA supérieur au chiffre d'affaires (${chiffreAffaires} FCFA).`
      );
    }

    const numero = genererNumeroAchat();
    let fa;
    try {
      [fa] = await db.query(
        `INSERT INTO facture_achat
           (id_fournisseur, numero, date_achat, montant_total, statut, idempotency_key)
         VALUES (?, ?, NOW(), ?, 'recue', ?)`,
        [idFournisseur, numero, montantTotal, key]
      );
    } catch (e) {
      const msg = String(e.message || e);
      if (key && /duplicate|unique/i.test(msg)) {
        const [ex] = await pool.query(
          'SELECT * FROM facture_achat WHERE idempotency_key = ? LIMIT 1',
          [key]
        );
        if (ex && ex.length) {
          await db.rollback();
          return { ...ex[0], replay: true };
        }
      }
      [fa] = await db.query(
        `INSERT INTO facture_achat
           (id_fournisseur, numero, date_achat, montant_total, statut)
         VALUES (?, ?, NOW(), ?, 'recue')`,
        [idFournisseur, numero, montantTotal]
      );
    }

    const idAchat = extractInsertId(fa, 'id_facture_achat');
    if (!idAchat) {
      throw new ApiError(
        500,
        "Impossible d'obtenir l'identifiant de la facture d'achat (insertId manquant)"
      );
    }

    for (const l of lignes) {
      const sousTotal = Number(l.quantite) * Number(l.prixUnitaire);
      await db.query(
        `INSERT INTO detail_achat
           (id_facture_achat, id_variante, quantite, prix_achat, sous_total)
         VALUES (?, ?, ?, ?, ?)`,
        [idAchat, l.idVariante, l.quantite, l.prixUnitaire, sousTotal]
      );

      await db.query(
        'UPDATE variante SET stock = stock + ? WHERE id_variante = ?',
        [l.quantite, l.idVariante]
      );

      await db.query(
        `INSERT INTO mouvement_stock
           (variante, typeMouvement, quantite, motif, documentType, documentId, dateMouvement)
         VALUES (?, 'entree', ?, 'achat fournisseur', 'achat', ?, NOW())`,
        [l.idVariante, l.quantite, idAchat]
      );
    }

    await db.commit();

    const [achat] = await pool.query(
      'SELECT * FROM facture_achat WHERE id_facture_achat = ?',
      [idAchat]
    );
    const [details] = await pool.query(
      'SELECT * FROM detail_achat WHERE id_facture_achat = ?',
      [idAchat]
    );
    return { ...achat[0], details };
  } catch (e) {
    try {
      await db.rollback();
    } catch (_) {}
    throw e;
  } finally {
    db.release();
  }
}

module.exports = { listAchats, getAchat, createAchat };
