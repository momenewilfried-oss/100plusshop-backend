const pool = require('../config/database');

/**
 * Schéma réel mouvement_stock (camelCase) :
 * idMouvement, variante, typeMouvement, quantite, motif,
 * documentType, documentId, dateMouvement
 */

async function resumeStocks() {
  const [[total]] = await pool.query(
    'SELECT COALESCE(SUM(stock), 0) AS total_articles FROM variante'
  );

  let entrees_30j = 0;
  let sorties_30j = 0;
  try {
    const [flux] = await pool.query(`
      SELECT
        SUM(CASE WHEN typeMouvement = 'entree' THEN quantite ELSE 0 END) AS entrees,
        SUM(CASE WHEN typeMouvement = 'sortie' THEN quantite ELSE 0 END) AS sorties
      FROM mouvement_stock
      WHERE dateMouvement >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `);
    entrees_30j = Number(flux[0]?.entrees || 0);
    sorties_30j = Number(flux[0]?.sorties || 0);
  } catch (_) {
    /* ignore */
  }

  let nb_alertes = 0;
  try {
    const [[a]] = await pool.query(
      'SELECT COUNT(*) AS nb FROM variante WHERE stock <= seuil_alerte'
    );
    nb_alertes = Number(a?.nb || 0);
  } catch (_) {
    /* ignore */
  }

  return {
    total_articles: Number(total?.total_articles || 0),
    entrees_30j,
    sorties_30j,
    nb_alertes,
  };
}

async function listMouvements({ page = 1, limit = 15 } = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 15));
  const offset = (pageNum - 1) * limitNum;

  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM mouvement_stock'
  );

  const [rows] = await pool.query(
    `
    SELECT
      m.idMouvement,
      m.variante AS id_variante,
      m.typeMouvement,
      m.quantite,
      m.motif,
      m.documentType,
      m.documentId,
      m.dateMouvement,
      p.nom AS produit_nom,
      v.taille,
      v.couleur
    FROM mouvement_stock m
    LEFT JOIN variante v ON m.variante = v.id_variante
    LEFT JOIN produit p ON v.id_produit = p.id_produit
    ORDER BY m.dateMouvement DESC
    LIMIT ? OFFSET ?
  `,
    [limitNum, offset]
  );

  const totalPages = Math.max(1, Math.ceil(Number(total) / limitNum));

  return {
    data: rows,
    total: Number(total),
    page: pageNum,
    limit: limitNum,
    totalPages,
  };
}

async function alertesStock() {
  const [rows] = await pool.query(`
    SELECT
      p.nom AS produit_nom,
      p.reference,
      v.id_variante,
      v.taille,
      v.couleur,
      v.stock,
      v.seuil_alerte,
      CASE
        WHEN v.stock = 0 THEN 'Critique'
        WHEN v.stock <= CEILING(COALESCE(v.seuil_alerte, 0) / 2) THEN 'Critique'
        ELSE 'Attention'
      END AS niveau
    FROM variante v
    JOIN produit p ON v.id_produit = p.id_produit
    WHERE v.stock <= COALESCE(v.seuil_alerte, 0)
    ORDER BY v.stock ASC
  `);
  return rows;
}

async function getVarianteForUpdate(db, idVariante) {
  const [rows] = await db.query(
    'SELECT stock FROM variante WHERE id_variante = ?',
    [idVariante]
  );
  return rows[0] || null;
}

async function updateVarianteStock(db, idVariante, nouveauStock) {
  await db.query('UPDATE variante SET stock = ? WHERE id_variante = ?', [
    nouveauStock,
    idVariante,
  ]);
}


async function findByIdempotencyKey(key) {
  if (!key) return null;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM mouvement_stock WHERE idempotency_key = ? LIMIT 1',
      [String(key).slice(0, 64)]
    );
    return rows[0] || null;
  } catch (_) {
    return null;
  }
}

async function findRecentSameMouvement(idVariante, typeMouvement, quantite, windowSeconds = 10) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM mouvement_stock
       WHERE variante = ?
         AND "typeMouvement" = ?
         AND quantite = ?
         AND "dateMouvement" >= NOW() - (? * INTERVAL '1 second')
       ORDER BY "idMouvement" DESC
       LIMIT 1`,
      [idVariante, typeMouvement, quantite, windowSeconds]
    );
    return rows[0] || null;
  } catch (_) {
    try {
      const [rows] = await pool.query(
        `SELECT * FROM mouvement_stock
         WHERE variante = ?
           AND typeMouvement = ?
           AND quantite = ?
           AND dateMouvement >= NOW() - INTERVAL '10 seconds'
         ORDER BY idMouvement DESC LIMIT 1`,
        [idVariante, typeMouvement, quantite]
      );
      return rows[0] || null;
    } catch {
      return null;
    }
  }
}

async function insertMouvement(db, { idVariante, typeMouvement, quantite, motif, idempotencyKey }) {
  const key = idempotencyKey ? String(idempotencyKey).slice(0, 64) : null;
  try {
    const [r] = await db.query(
      `INSERT INTO mouvement_stock
       (variante, "typeMouvement", quantite, motif, "dateMouvement", idempotency_key)
       VALUES (?, ?, ?, ?, NOW(), ?)`,
      [idVariante, typeMouvement, quantite, motif || null, key]
    );
    return r.insertId ?? r[0]?.idMouvement ?? r.rows?.[0]?.idMouvement;
  } catch (e) {
    const msg = String(e.message || e);
    if (key && /duplicate|unique/i.test(msg)) {
      const ex = await findByIdempotencyKey(key);
      if (ex) return ex.idMouvement || ex.id_mouvement;
    }
    // fallback sans idempotency_key
    const [r] = await db.query(
      `INSERT INTO mouvement_stock
       (variante, "typeMouvement", quantite, motif, "dateMouvement")
       VALUES (?, ?, ?, ?, NOW())`,
      [idVariante, typeMouvement, quantite, motif || null]
    );
    return r.insertId ?? r[0]?.idMouvement ?? r.rows?.[0]?.idMouvement;
  }
}

module.exports = {
  findByIdempotencyKey,
  findRecentSameMouvement,
  resumeStocks,
  listMouvements,
  alertesStock,
  getVarianteForUpdate,
  updateVarianteStock,
  insertMouvement,
};
