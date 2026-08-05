const pool = require('../config/database');

async function resumeStocks(req, res) {
  try {
    const [total] = await pool.query('SELECT COALESCE(SUM(stock), 0) AS total_articles FROM variante');
    const [entrees] = await pool.query(`
      SELECT COALESCE(SUM(quantite), 0) AS entrees_30j FROM mouvement_stock
      WHERE typeMouvement = 'entree' AND dateMouvement >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);
    const [sorties] = await pool.query(`
      SELECT COALESCE(SUM(quantite), 0) AS sorties_30j FROM mouvement_stock
      WHERE typeMouvement = 'sortie' AND dateMouvement >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);
    const [alertes] = await pool.query('SELECT COUNT(*) AS nb_alertes FROM variante WHERE stock <= seuil_alerte');

    res.json({
      total_articles: Number(total[0].total_articles),
      entrees_30j: Number(entrees[0].entrees_30j),
      sorties_30j: Number(sorties[0].sorties_30j),
      nb_alertes: Number(alertes[0].nb_alertes)
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  }
}

async function listerMouvements(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT m.idMouvement, m.variante AS id_variante, m.typeMouvement, m.quantite,
             m.motif, m.documentType, m.documentId, m.dateMouvement,
             p.nom AS produit_nom, p.reference, v.taille, v.couleur
      FROM mouvement_stock m
      JOIN variante v ON m.variante = v.id_variante
      JOIN produit p ON v.id_produit = p.id_produit
      ORDER BY m.dateMouvement DESC LIMIT 100
    `);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  }
}

async function alertesStock(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT v.id_variante, v.taille, v.couleur, v.stock, v.seuil_alerte,
             p.id_produit, p.nom AS produit_nom, p.reference,
             CASE WHEN v.stock = 0 THEN 'Critique' WHEN v.stock <= v.seuil_alerte THEN 'Alerte' ELSE 'OK' END AS niveau
      FROM variante v
      JOIN produit p ON v.id_produit = p.id_produit
      WHERE v.stock <= v.seuil_alerte
      ORDER BY v.stock ASC
    `);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  }
}

async function analyseFlux(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT DATE(dateMouvement) AS jour,
             SUM(CASE WHEN typeMouvement = 'entree' THEN quantite ELSE 0 END) AS entrees,
             SUM(CASE WHEN typeMouvement = 'sortie' THEN quantite ELSE 0 END) AS sorties
      FROM mouvement_stock
      WHERE dateMouvement >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(dateMouvement)
      ORDER BY jour ASC
    `);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  }
}

async function creerMouvement(req, res) {
  const db = await pool.getConnection();
  try {
    const body = req.body || {};
    const { idVariante, typeMouvement, quantite, motif } = body;

    if (!idVariante || !typeMouvement || !quantite) {
      db.release();
      return res.status(400).json({ message: 'idVariante, typeMouvement et quantite obligatoires' });
    }

    await db.beginTransaction();

    const [variante] = await db.query('SELECT stock FROM variante WHERE id_variante = ? FOR UPDATE', [idVariante]);
    if (variante.length === 0) throw new Error('Variante introuvable');

    let nouveauStock = variante[0].stock;
    if (typeMouvement === 'entree') nouveauStock += quantite;
    else if (typeMouvement === 'sortie') {
      if (variante[0].stock < quantite) throw new Error('Stock insuffisant');
      nouveauStock -= quantite;
    } else nouveauStock = quantite;

    await db.query('UPDATE variante SET stock = ? WHERE id_variante = ?', [nouveauStock, idVariante]);

    const qte = typeMouvement === 'ajustement' ? Math.abs(quantite - variante[0].stock) : quantite;

    const [r] = await db.query(
      `INSERT INTO mouvement_stock (variante, typeMouvement, quantite, motif, documentType, documentId, dateMouvement)
       VALUES (?, ?, ?, ?, 'manuel', NULL, NOW())`,
      [idVariante, typeMouvement, qte, motif || 'Mouvement manuel']
    );

    await db.commit();
    res.status(201).json({ message: 'Mouvement enregistré', idMouvement: r.insertId, nouveau_stock: nouveauStock });
  } catch (e) {
    await db.rollback();
    console.error(e);
    res.status(500).json({ message: e.message || 'Erreur serveur' });
  } finally {
    db.release();
  }
}

module.exports = {
  resumeStocks,
  listerMouvements,
  alertesStock,
  analyseFlux,
  creerMouvement
};