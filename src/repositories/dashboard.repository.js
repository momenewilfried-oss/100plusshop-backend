const pool = require('../config/database');

async function getCaForDate(dateCondition) {
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(montant_total), 0) AS ca
     FROM vente
     WHERE ${dateCondition}
       AND statut = 'validee'`
  );
  return Number(rows[0]?.ca || 0);
}

async function getCountSalesForDate(dateCondition) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS nb_commandes
     FROM vente
     WHERE ${dateCondition}
       AND statut = 'validee'`
  );
  return Number(rows[0]?.nb_commandes || 0);
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
    WHERE MONTH(date_creation) = MONTH(CURDATE())
      AND YEAR(date_creation) = YEAR(CURDATE())
  `);
  return Number(rows[0]?.nb_nouveaux || 0);
}

async function getStockAlerts(limit = 10) {
  const [rows] = await pool.query(`
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
  `, [limit]);
  return rows;
}

async function getSalesPerformance(days) {
  const [rows] = await pool.query(`
    SELECT
      DATE(date_vente) AS jour,
      COALESCE(SUM(montant_total), 0) AS ca
    FROM vente
    WHERE date_vente >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      AND statut = 'validee'
    GROUP BY DATE(date_vente)
    ORDER BY jour ASC
  `, [days]);
  return rows;
}

async function getLatestSales(limit = 5) {
  const [rows] = await pool.query(`
    SELECT
      v.id_vente,
      v.date_vente,
      v.montant_total,
      v.mode_paiement_principal,
      v.statut,
      CONCAT(c.prenom, ' ', c.nom) AS client_nom
    FROM vente v
    LEFT JOIN client c ON v.id_client = c.id_client
    ORDER BY v.date_vente DESC
    LIMIT ?
  `, [limit]);
  return rows;
}

module.exports = {
  getCaForDate,
  getCountSalesForDate,
  getTotalStock,
  getNewClientsThisMonth,
  getStockAlerts,
  getSalesPerformance,
  getLatestSales,
};