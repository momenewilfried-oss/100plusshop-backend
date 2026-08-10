const pool = require('../config/database');

async function getSalesStatsForDate(dateConditionSql) {
  const [rows] = await pool.query(
    `SELECT
       COALESCE(SUM(montant_total), 0) AS ca,
       COUNT(*) AS nb_commandes
     FROM vente
     WHERE ${dateConditionSql}
       AND statut = 'validee'`
  );
  return {
    ca: Number(rows[0]?.ca || 0),
    nb_commandes: Number(rows[0]?.nb_commandes || 0),
  };
}

async function getCaForDate(dateConditionSql) {
  const s = await getSalesStatsForDate(dateConditionSql);
  return s.ca;
}

async function getCountSalesForDate(dateConditionSql) {
  const s = await getSalesStatsForDate(dateConditionSql);
  return s.nb_commandes;
}

async function getTotalStock() {
  const [rows] = await pool.query(`
    SELECT COALESCE(SUM(stock), 0) AS stock_total
    FROM variante
  `);
  return Number(rows[0]?.stock_total || 0);
}

async function getNewClientsThisMonth() {
  const [rows] = await pool.query(`
    SELECT COUNT(*) AS nb_nouveaux
    FROM client
    WHERE date_creation >= date_trunc('month', CURRENT_DATE)::timestamp
      AND date_creation < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::timestamp
  `);
  return Number(rows[0]?.nb_nouveaux || 0);
}

async function getStockAlerts(limit = 10) {
  const [rows] = await pool.query(
    `
    SELECT
      v.id_variante,
      v.taille,
      v.couleur,
      v.stock,
      v.seuil_alerte,
      p.nom AS produit_nom,
      p.reference
    FROM variante v
    JOIN produit p ON v.id_produit = p.id_produit
    WHERE v.stock <= v.seuil_alerte
    ORDER BY v.stock ASC
    LIMIT ?
  `,
    [limit]
  );
  return rows;
}

async function getSalesPerformance(days) {
  const n = Math.max(1, Number(days) || 7);
  const [rows] = await pool.query(
    `
    SELECT
      (date_vente)::date AS jour,
      COALESCE(SUM(montant_total), 0) AS ca
    FROM vente
    WHERE date_vente >= (CURRENT_DATE - (? * INTERVAL '1 day'))
      AND statut = 'validee'
    GROUP BY (date_vente)::date
    ORDER BY jour ASC
  `,
    [n]
  );
  return rows;
}

async function getLatestSales(limit = 5) {
  const [rows] = await pool.query(
    `
    SELECT
      v.id_vente,
      v.date_vente,
      v.montant_total,
      v.mode_paiement_principal,
      v.statut,
      CONCAT(COALESCE(c.prenom, ''), ' ', COALESCE(c.nom, '')) AS client_nom
    FROM vente v
    LEFT JOIN client c ON v.id_client = c.id_client
    ORDER BY v.date_vente DESC
    LIMIT ?
  `,
    [limit]
  );
  return rows;
}

module.exports = {
  getSalesStatsForDate,
  getCaForDate,
  getCountSalesForDate,
  getTotalStock,
  getNewClientsThisMonth,
  getStockAlerts,
  getSalesPerformance,
  getLatestSales,
};