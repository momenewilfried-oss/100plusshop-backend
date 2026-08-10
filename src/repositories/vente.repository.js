const pool = require('../config/database');

async function listSales() {
  const [rows] = await pool.query(`
    SELECT v.*,
           u.nom AS vendeur_nom, u.prenom AS vendeur_prenom,
           c.nom AS client_nom, c.prenom AS client_prenom,
           (
             SELECT STRING_AGG(sub.ligne, ', ' ORDER BY sub.id_detail)
             FROM (
               SELECT dv.id_detail,
                      (p.nom || ' ×' || dv.quantite::text) AS ligne
               FROM detail_vente dv
               JOIN variante var ON dv.id_variante = var.id_variante
               JOIN produit p ON var.id_produit = p.id_produit
               WHERE dv.id_vente = v.id_vente
             ) sub
           ) AS articles_resume
    FROM vente v
    LEFT JOIN utilisateur u ON v.id_vendeur = u.id_utilisateur
    LEFT JOIN client c ON v.id_client = c.id_client
    ORDER BY v.date_vente DESC
  `);
  return rows;
}

async function getSaleById(id) {
  const [rows] = await pool.query(
    `SELECT v.*,
            u.nom AS vendeur_nom, u.prenom AS vendeur_prenom,
            c.nom AS client_nom, c.prenom AS client_prenom
     FROM vente v
     LEFT JOIN utilisateur u ON v.id_vendeur = u.id_utilisateur
     LEFT JOIN client c ON v.id_client = c.id_client
     WHERE v.id_vente = ?`,
    [id]
  );
  return rows[0] || null;
}

async function getSaleDetails(id) {
  const [rows] = await pool.query(
    `SELECT dv.*, var.taille, var.couleur, p.nom AS produit_nom, p.reference
     FROM detail_vente dv
     JOIN variante var ON dv.id_variante = var.id_variante
     JOIN produit p ON var.id_produit = p.id_produit
     WHERE dv.id_vente = ?`,
    [id]
  );
  return rows;
}

async function getVariantForUpdate(db, idVariante) {
  const [rows] = await db.query(
    'SELECT stock FROM variante WHERE id_variante = ? FOR UPDATE',
    [idVariante]
  );
  return rows[0] || null;
}

async function getPromoForVariant(db, idVariante) {
  const [rows] = await db.query(
    `SELECT p.type, p.valeur, p.nom
     FROM promotion p
     JOIN variante_promotion vp ON vp.id_promotion = p.id_promotion
     WHERE vp.id_variante = ?
       AND p.statut = 'active'
       AND p.date_debut <= NOW()
       AND p.date_fin >= NOW()
     ORDER BY p.valeur DESC
     LIMIT 1`,
    [idVariante]
  );
  return rows[0] || null;
}

async function insertSale(
  db,
  { idVendeur, idClient, remiseGlobale, montantTotal, modePaiementPrincipal }
) {
  const [result] = await db.query(
    `INSERT INTO vente
     (date_vente, id_vendeur, id_client, remise_globale, montant_total, mode_paiement_principal, statut)
     VALUES (NOW(), ?, ?, ?, ?, ?, 'validee')`,
    [
      idVendeur,
      idClient || null,
      remiseGlobale || 0,
      montantTotal,
      modePaiementPrincipal,
    ]
  );

  // Toujours privilégier id_vente (jamais un éventuel id_client pris par erreur)
  const id =
    result[0]?.id_vente ??
    result.rows?.[0]?.id_vente ??
    result.insertId;

  if (id == null || Number(id) <= 0) {
    throw new Error('INSERT vente: id_vente non retourné');
  }
  return Number(id);
}

async function insertDetail(
  db,
  { idVente, idVariante, quantite, prixUnitaire, remise, sousTotal }
) {
  await db.query(
    `INSERT INTO detail_vente
     (id_vente, id_variante, quantite, prix_unitaire, remise, sous_total)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [idVente, idVariante, quantite, prixUnitaire, remise, sousTotal]
  );
}

async function adjustVariantStock(db, idVariante, delta) {
  await db.query(
    'UPDATE variante SET stock = stock + ? WHERE id_variante = ?',
    [delta, idVariante]
  );
}

async function insertStockMovement(
  db,
  { variante, typeMouvement, quantite, motif, documentType, documentId }
) {
  await db.query(
    `INSERT INTO mouvement_stock
     (variante, typeMouvement, quantite, motif, documentType, documentId)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [variante, typeMouvement, quantite, motif, documentType, documentId]
  );
}

async function getSaleFinal(poolRef, id) {
  const db = poolRef || pool;
  const [rows] = await db.query('SELECT * FROM vente WHERE id_vente = ?', [id]);
  return rows[0] || null;
}

async function getSaleDetailsFinal(poolRef, id) {
  const db = poolRef || pool;
  const [rows] = await db.query(
    'SELECT * FROM detail_vente WHERE id_vente = ?',
    [id]
  );
  return rows;
}

module.exports = {
  listSales,
  getSaleById,
  getSaleDetails,
  getVariantForUpdate,
  getPromoForVariant,
  insertSale,
  insertDetail,
  adjustVariantStock,
  insertStockMovement,
  getSaleFinal,
  getSaleDetailsFinal,
};