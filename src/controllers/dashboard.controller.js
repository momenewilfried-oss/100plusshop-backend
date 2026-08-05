const pool = require('../config/database');

async function getDashboard(req, res) {
  try {
    // ===== CA du jour =====
    const [caJour] = await pool.query(`
      SELECT COALESCE(SUM(montant_total), 0) AS ca_jour
      FROM vente
      WHERE DATE(date_vente) = CURDATE()
        AND statut = 'validee'
    `);

    // CA hier (pour le %)
    const [caHier] = await pool.query(`
      SELECT COALESCE(SUM(montant_total), 0) AS ca_hier
      FROM vente
      WHERE DATE(date_vente) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
        AND statut = 'validee'
    `);

    const caAujourdhui = Number(caJour[0].ca_jour);
    const caVeille = Number(caHier[0].ca_hier);

    let evolutionCa = 0;
    if (caVeille > 0) {
      evolutionCa = Number(
        (((caAujourdhui - caVeille) / caVeille) * 100).toFixed(1)
      );
    } else if (caAujourdhui > 0) {
      // Hier = 0 et aujourd'hui > 0 → hausse max affichée
      evolutionCa = 100;
    }

    // Plafond : jamais plus de ±100 %
    evolutionCa = Math.max(-100, Math.min(100, evolutionCa));

    // ===== Nombre de commandes aujourd'hui =====
    const [commandes] = await pool.query(`
      SELECT COUNT(*) AS nb_commandes
      FROM vente
      WHERE DATE(date_vente) = CURDATE()
        AND statut = 'validee'
    `);

    // ===== Stock total =====
    const [stock] = await pool.query(`
      SELECT COALESCE(SUM(stock), 0) AS stock_total
      FROM variante
    `);

    // ===== Nouveaux clients ce mois =====
    const [nouveauxClients] = await pool.query(`
      SELECT COUNT(*) AS nb_nouveaux
      FROM client
      WHERE MONTH(date_creation) = MONTH(CURDATE())
        AND YEAR(date_creation) = YEAR(CURDATE())
    `);

    // ===== Alertes stock =====
    const [alertes] = await pool.query(`
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
      LIMIT 10
    `);

    // ===== Performance ventes (7 derniers jours) =====
    const [performance] = await pool.query(`
      SELECT
        DATE(date_vente) AS jour,
        COALESCE(SUM(montant_total), 0) AS ca
      FROM vente
      WHERE date_vente >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        AND statut = 'validee'
      GROUP BY DATE(date_vente)
      ORDER BY jour ASC
    `);

    // ===== Dernières ventes =====
    const [dernieresVentes] = await pool.query(`
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
      LIMIT 5
    `);

    res.json({
      ca_jour: caAujourdhui,
      evolution_ca: evolutionCa,
      nb_commandes: Number(commandes[0].nb_commandes),
      stock_total: Number(stock[0].stock_total),
      nouveaux_clients: Number(nouveauxClients[0].nb_nouveaux),
      nb_alertes: alertes.length,
      alertes_stock: alertes,
      performance_7j: performance,
      dernieres_ventes: dernieresVentes,
    });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message });
  }
}

module.exports = { getDashboard };