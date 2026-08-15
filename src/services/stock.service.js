const { ApiError } = require('../utils/error-handler');
const pool = require('../config/database');
const stockRepository = require('../repositories/stock.repository');
const { logAction } = require('./audit.service');

async function resumeStocks() {
  return stockRepository.resumeStocks();
}

async function listerMouvements({ page, limit } = {}) {
  try {
    return await stockRepository.listMouvements({ page, limit });
  } catch (e) {
    return { data: [], total: 0, page: 1, limit: Number(limit) || 15, totalPages: 1 };
  }
}

async function alertesStock() {
  return stockRepository.alertesStock();
}

async function analyseFlux() {
  try {
    const [rows] = await pool.query(`
      SELECT DATE(COALESCE(date_mouvement, dateMouvement)) AS jour,
             SUM(CASE WHEN COALESCE(type_mouvement, typeMouvement) = 'entree' THEN quantite ELSE 0 END) AS entrees,
             SUM(CASE WHEN COALESCE(type_mouvement, typeMouvement) = 'sortie' THEN quantite ELSE 0 END) AS sorties
      FROM mouvement_stock
      WHERE COALESCE(date_mouvement, dateMouvement) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(COALESCE(date_mouvement, dateMouvement))
      ORDER BY jour ASC
    `);
    return rows;
  } catch {
    return [];
  }
}

async function creerMouvement(body, user) {
  const { idVariante, typeMouvement, quantite, motif } = body || {};
  if (!idVariante || !typeMouvement || quantite == null) {
    throw new ApiError(400, 'idVariante, typeMouvement et quantite obligatoires');
  }

  // Anti double-clic : même mouvement dans les 5 dernières secondes
  try {
    const [dup] = await pool.query(
      `SELECT 1 AS ok FROM mouvement_stock
       WHERE variante = ?
         AND "typeMouvement" = ?
         AND quantite = ?
         AND "dateMouvement" >= NOW() - INTERVAL '5 seconds'
       LIMIT 1`,
      [idVariante, typeMouvement, Number(quantite)]
    );
    if (dup && dup.length) {
      throw new ApiError(409, 'Mouvement de stock identique déjà enregistré il y a moins de 5 secondes');
    }
  } catch (e) {
    if (e.statusCode === 409 || e.status === 409) throw e;
    // colonnes différentes : on ignore le check soft
  }

  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    const variante = await stockRepository.getVarianteForUpdate(db, idVariante);
    if (!variante) throw new ApiError(404, 'Variante introuvable');

    let nouveauStock = Number(variante.stock);
    const qte = Number(quantite);
    if (typeMouvement === 'entree') nouveauStock += qte;
    else if (typeMouvement === 'sortie') {
      if (variante.stock < qte) throw new ApiError(409, 'Stock insuffisant');
      nouveauStock -= qte;
    } else {
      nouveauStock = qte;
    }

    await stockRepository.updateVarianteStock(db, idVariante, nouveauStock);
    const idMouvement = await stockRepository.insertMouvement(db, {
      idVariante,
      typeMouvement,
      quantite: typeMouvement === 'ajustement' ? Math.abs(qte - Number(variante.stock)) : qte,
      motif,
    });
    await db.commit();

    await logAction({
      userId: user?.id || null,
      module: 'stock',
      action: 'MOUVEMENT',
      oldValue: { idVariante, stock: variante.stock },
      newValue: { idVariante, stock: nouveauStock, typeMouvement, quantite: qte },
    });

    return {
      message: 'Mouvement enregistré',
      idMouvement,
      nouveau_stock: nouveauStock,
    };
  } catch (e) {
    await db.rollback();
    throw e;
  } finally {
    db.release();
  }
}

module.exports = {
  resumeStocks,
  listerMouvements,
  alertesStock,
  analyseFlux,
  creerMouvement,
};
