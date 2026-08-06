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

async function createAchat({ idFournisseur, lignes } = {}) {
  const db = await pool.getConnection();
  try {
    if (!idFournisseur || !lignes || lignes.length === 0) {
      throw new ApiError(400, 'idFournisseur et lignes (non vide) obligatoires');
    }
    await db.beginTransaction();
    const [four] = await db.query('SELECT id_fournisseur FROM fournisseur WHERE id_fournisseur = ?', [idFournisseur]);
    if (four.length === 0) throw new ApiError(409, 'Fournisseur introuvable');

    let montantTotal = 0;
    for (const l of lignes) {
      if (!l.idVariante || !l.quantite || l.prixUnitaire == null) {
        throw new ApiError(409, 'Chaque ligne doit avoir idVariante, quantite, prixUnitaire');
      }
      const [v] = await db.query('SELECT id_variante FROM variante WHERE id_variante = ?', [l.idVariante]);
      if (v.length === 0) throw new ApiError(409, `Variante ${l.idVariante} introuvable`);
      montantTotal += Number(l.quantite) * Number(l.prixUnitaire);
    }

    const numero = genererNumeroAchat();
    const [fa] = await db.query(
      `INSERT INTO facture_achat
       (id_fournisseur, numero, date_achat, montant_total, statut)
       VALUES (?, ?, NOW(), ?, 'recue')`,
      [idFournisseur, numero, montantTotal]
    );
    const idAchat = fa.insertId;

    for (const l of lignes) {
      const sousTotal = Number(l.quantite) * Number(l.prixUnitaire);
      await db.query(
        `INSERT INTO detail_achat
         (id_facture_achat, id_variante, quantite, prix_achat, sous_total)
         VALUES (?, ?, ?, ?, ?)`,
        [idAchat, l.idVariante, l.quantite, l.prixUnitaire, sousTotal]
      );

      await db.query('UPDATE variante SET stock = stock + ? WHERE id_variante = ?', [l.quantite, l.idVariante]);

      await db.query(
        `INSERT INTO mouvement_stock
         (variante, typeMouvement, quantite, motif, documentType, documentId, dateMouvement)
         VALUES (?, 'entree', ?, 'achat fournisseur', 'achat', ?, NOW())`,
        [l.idVariante, l.quantite, idAchat]
      );
    }

    await db.commit();

    const [achat] = await pool.query('SELECT * FROM facture_achat WHERE id_facture_achat = ?', [idAchat]);
    const [details] = await pool.query('SELECT * FROM detail_achat WHERE id_facture_achat = ?', [idAchat]);
    return { ...achat[0], details };
  } catch (e) {
    await db.rollback();
    throw e;
  } finally {
    db.release();
  }
}

module.exports = { listAchats, getAchat, createAchat };
