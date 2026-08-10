const dashboardRepository = require('../repositories/dashboard.repository');

function calculateEvolution(current, previous) {
  let evolutionCa = 0;
  if (previous > 0) {
    evolutionCa = Number((((current - previous) / previous) * 100).toFixed(1));
  } else if (current > 0) {
    evolutionCa = 100;
  }
  return Math.max(-100, Math.min(100, evolutionCa));
}

async function safe(promise, fallback) {
  try {
    return await promise;
  } catch (e) {
    console.error('[dashboard]', e.message);
    return fallback;
  }
}

/**
 * Conditions de date en PostgreSQL (pas de MONTH/CURDATE MySQL).
 */
async function getDashboard() {
  const [
    statsAujourdhui,
    statsVeille,
    stockTotal,
    nouveauxClients,
    alertesStock,
    performance7j,
    dernieresVentes,
  ] = await Promise.all([
    safe(
      dashboardRepository.getSalesStatsForDate(
        "(date_vente)::date = CURRENT_DATE"
      ),
      { ca: 0, nb_commandes: 0 }
    ),
    safe(
      dashboardRepository.getSalesStatsForDate(
        "(date_vente)::date = (CURRENT_DATE - INTERVAL '1 day')::date"
      ),
      { ca: 0, nb_commandes: 0 }
    ),
    safe(dashboardRepository.getTotalStock(), 0),
    safe(dashboardRepository.getNewClientsThisMonth(), 0),
    safe(dashboardRepository.getStockAlerts(10), []),
    safe(dashboardRepository.getSalesPerformance(7), []),
    safe(dashboardRepository.getLatestSales(5), []),
  ]);

  const caAujourdhui = Number(statsAujourdhui.ca || 0);
  const evolutionCa = calculateEvolution(
    caAujourdhui,
    Number(statsVeille.ca || 0)
  );

  return {
    ca_jour: caAujourdhui,
    evolution_ca: evolutionCa,
    nb_commandes: Number(statsAujourdhui.nb_commandes || 0),
    stock_total: stockTotal,
    nouveaux_clients: nouveauxClients,
    nb_alertes: Array.isArray(alertesStock) ? alertesStock.length : 0,
    alertes_stock: alertesStock || [],
    performance_7j: performance7j || [],
    dernieres_ventes: dernieresVentes || [],
  };
}

module.exports = { getDashboard };