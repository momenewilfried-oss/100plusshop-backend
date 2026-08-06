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

async function getDashboard() {
  const caAujourdhui = await dashboardRepository.getCaForDate('DATE(date_vente) = CURDATE()');
  const caVeille = await dashboardRepository.getCaForDate("DATE(date_vente) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)");
  const evolutionCa = calculateEvolution(caAujourdhui, caVeille);

  const nbCommandes = await dashboardRepository.getCountSalesForDate('DATE(date_vente) = CURDATE()');
  const stockTotal = await dashboardRepository.getTotalStock();
  const nouveauxClients = await dashboardRepository.getNewClientsThisMonth();
  const alertesStock = await dashboardRepository.getStockAlerts(10);
  const performance7j = await dashboardRepository.getSalesPerformance(7);
  const dernieresVentes = await dashboardRepository.getLatestSales(5);

  return {
    ca_jour: caAujourdhui,
    evolution_ca: evolutionCa,
    nb_commandes: nbCommandes,
    stock_total: stockTotal,
    nouveaux_clients: nouveauxClients,
    nb_alertes: alertesStock.length,
    alertes_stock: alertesStock,
    performance_7j: performance7j,
    dernieres_ventes: dernieresVentes,
  };
}

module.exports = { getDashboard };
