const { ApiError } = require('../utils/error-handler');
const pool = require('../config/database');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function formatFcfa(valeur) {
  const n = Math.round(Number(valeur || 0));
  const digits = String(Math.abs(n));
  const withSpaces = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const sign = n < 0 ? '-' : '';
  return sign + withSpaces + ' FCFA';
}

function genererNumero() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `FACT-${y}${m}${d}-${rand}`;
}

async function listerFactures(statut) {
  let sql = `
    SELECT f.*,
           c.nom AS client_nom, c.prenom AS client_prenom, c.email AS client_email,
           v.date_vente, v.mode_paiement_principal
    FROM facture f
    LEFT JOIN vente v ON f.id_vente = v.id_vente
    LEFT JOIN client c ON v.id_client = c.id_client
  `;
  const params = [];
  if (statut) {
    sql += ' WHERE f.statut = ?';
    params.push(statut);
  }
  sql += ' ORDER BY f.date_facture DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function obtenirFacture(id) {
  const [factures] = await pool.query(
    `SELECT f.*,
            c.nom AS client_nom, c.prenom AS client_prenom, c.email AS client_email, c.telephone AS client_telephone,
            v.date_vente, v.mode_paiement_principal, v.remise_globale
     FROM facture f
     LEFT JOIN vente v ON f.id_vente = v.id_vente
     LEFT JOIN client c ON v.id_client = c.id_client
     WHERE f.id_facture = ?`,
    [id]
  );
  if (factures.length === 0) return null;
  const facture = factures[0];
  let details = [];
  if (facture.id_vente) {
    const [lignes] = await pool.query(
      `SELECT dv.*, p.nom AS produit_nom, p.reference, var.taille, var.couleur
       FROM detail_vente dv
       JOIN variante var ON dv.id_variante = var.id_variante
       JOIN produit p ON var.id_produit = p.id_produit
       WHERE dv.id_vente = ?`,
      [facture.id_vente]
    );
    details = lignes;
  }
  return { ...facture, details };
}

async function creerFactureDepuisVente({ idVente, statut }) {
  if (!idVente) throw new ApiError(400, 'idVente obligatoire');
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    const [ventes] = await db.query('SELECT * FROM vente WHERE id_vente = ? FOR UPDATE', [idVente]);
    if (ventes.length === 0) throw new ApiError(409, 'Vente introuvable');
    const vente = ventes[0];
    if (vente.statut === 'annulee') throw new ApiError(409, 'Impossible de facturer une vente annulée');
    const [existantes] = await db.query('SELECT id_facture FROM facture WHERE id_vente = ?', [idVente]);
    if (existantes.length > 0) throw new ApiError(409, 'Une facture existe déjà pour cette vente');
    const numero = genererNumero();
    const [result] = await db.query(
      `INSERT INTO facture (numero, date_facture, id_vente, montant_total, statut)
       VALUES (?, NOW(), ?, ?, ?)`,
      [numero, idVente, vente.montant_total, statut || 'Payée']
    );
    await db.commit();
    const [facture] = await pool.query('SELECT * FROM facture WHERE id_facture = ?', [result.insertId]);
    return facture[0];
  } catch (e) {
    await db.rollback();
    throw e;
  } finally {
    db.release();
  }
}

async function modifierStatutFacture(id, statut) {
  const statutsValides = ['Payée', 'En attente', 'Retard', 'Brouillon', 'Annulée'];
  if (!statut || !statutsValides.includes(statut)) {
    throw new ApiError(400, `Statut invalide. Valeurs possibles : ${statutsValides.join(', ')}`);
  }
  const [result] = await pool.query('UPDATE facture SET statut = ? WHERE id_facture = ?', [statut, id]);
  if (result.affectedRows === 0) throw new ApiError(404, 'Facture introuvable');
  const [facture] = await pool.query('SELECT * FROM facture WHERE id_facture = ?', [id]);
  return facture[0];
}

async function resumeFactures() {
  const [total] = await pool.query('SELECT COUNT(*) AS total FROM facture');
  const [payees] = await pool.query(`
    SELECT COALESCE(SUM(montant_total), 0) AS recettes
    FROM facture WHERE statut = 'Payée'
      AND MONTH(date_facture) = MONTH(CURDATE())
      AND YEAR(date_facture) = YEAR(CURDATE())
  `);
  const [enAttente] = await pool.query(`
    SELECT COALESCE(SUM(montant_total), 0) AS montant
    FROM facture WHERE statut = 'En attente'
  `);
  const [retards] = await pool.query(`
    SELECT COALESCE(SUM(montant_total), 0) AS montant
    FROM facture WHERE statut = 'Retard'
  `);
  return {
    total_factures: Number(total[0].total),
    recettes_payees_mois: Number(payees[0].recettes),
    en_attente: Number(enAttente[0].montant),
    retards: Number(retards[0].montant),
  };
}

async function genererPdfFacture(id) {
  const [factures] = await pool.query(
    `SELECT f.*,
            c.nom AS client_nom, c.prenom AS client_prenom,
            c.email AS client_email, c.telephone AS client_telephone,
            v.date_vente, v.mode_paiement_principal, v.remise_globale
     FROM facture f
     LEFT JOIN vente v ON f.id_vente = v.id_vente
     LEFT JOIN client c ON v.id_client = c.id_client
     WHERE f.id_facture = ?`,
    [id]
  );
  if (factures.length === 0) throw new ApiError(404, 'Facture introuvable');
  const facture = factures[0];
  let details = [];
  if (facture.id_vente) {
    const [lignes] = await pool.query(
      `SELECT dv.quantite, dv.prix_unitaire, dv.remise, dv.sous_total,
              p.nom AS produit_nom, p.reference, var.taille, var.couleur
       FROM detail_vente dv
       JOIN variante var ON dv.id_variante = var.id_variante
       JOIN produit p ON var.id_produit = p.id_produit
       WHERE dv.id_vente = ?`,
      [facture.id_vente]
    );
    details = lignes;
  }

  const dossierPdf = path.join(__dirname, '../../public/factures');
  if (!fs.existsSync(dossierPdf)) fs.mkdirSync(dossierPdf, { recursive: true });

  const logoCandidates = [
    path.join(__dirname, '../../public/logo_100plus.jpg.jpeg'),
    path.join(__dirname, '../../public/logo_100plus.jpg'),
    path.join(__dirname, '../../public/logo.png'),
    path.join(__dirname, '../../public/logo.jpg'),
  ];
  const logoPath = logoCandidates.find((p) => fs.existsSync(p));

  const nomFichier = `${facture.numero}.pdf`;
  const cheminFichier = path.join(dossierPdf, nomFichier);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const stream = fs.createWriteStream(cheminFichier);
  doc.pipe(stream);

  // header
  const headerTop = 45;
  if (logoPath) {
    try {
      doc.image(logoPath, 50, headerTop, { width: 70, height: 70, fit: [70, 70] });
    } catch (err) {
      // ignore logo errors
    }
  }
  const textLeft = logoPath ? 130 : 50;
  doc.fontSize(20).fillColor('#FF2D7B').text('100PLUSSHOP', textLeft, headerTop + 8, { continued: false });
  doc.fontSize(10).fillColor('#666666').text('Gestion boutique mode', textLeft, headerTop + 32);
  doc.fontSize(16).fillColor('#000000').text('FACTURE', 350, headerTop + 8, { width: 195, align: 'right' });
  doc.fontSize(11).fillColor('#333333').text(facture.numero, 350, headerTop + 30, { width: 195, align: 'right' });

  doc.y = Math.max(doc.y, headerTop + 80);
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#FF2D7B').lineWidth(1.5).stroke();
  doc.moveDown();

  const dateFacture = facture.date_facture ? new Date(facture.date_facture).toLocaleDateString('fr-FR') : '-';
  doc.fontSize(11).fillColor('#000000');
  doc.text(`Date : ${dateFacture}`);
  doc.text(`Statut : ${facture.statut}`);
  doc.text(`Paiement : ${facture.mode_paiement_principal || '-'}`);
  doc.moveDown();

  doc.fontSize(12).fillColor('#FF2D7B').text('Client');
  doc.fontSize(11).fillColor('#000000');
  if (facture.client_nom) {
    doc.text(`${facture.client_prenom || ''} ${facture.client_nom}`.trim());
    if (facture.client_email) doc.text(facture.client_email);
    if (facture.client_telephone) doc.text(String(facture.client_telephone));
  } else {
    doc.text('Client anonyme');
  }
  doc.moveDown();

  doc.fontSize(12).fillColor('#FF2D7B').text('Détail des articles');
  doc.moveDown(0.5);

  const y0 = doc.y;
  doc.rect(50, y0, 495, 20).fill('#FF2D7B');
  doc.fillColor('#FFFFFF').fontSize(9).text('Article', 55, y0 + 5, { width: 175 })
    .text('Qté', 235, y0 + 5, { width: 35 })
    .text('P.U.', 275, y0 + 5, { width: 80 })
    .text('Remise', 360, y0 + 5, { width: 70 })
    .text('Total', 440, y0 + 5, { width: 95 });

  let y = y0 + 22;
  details.forEach((ligne, i) => {
    const bg = i % 2 === 0 ? '#F9F9F9' : '#FFFFFF';
    doc.rect(50, y, 495, 20).fill(bg);
    const nom = `${ligne.produit_nom || ''} ${ligne.taille || ''} ${ligne.couleur || ''}`.trim();
    doc.fillColor('#000000').fontSize(8)
      .text(nom.substring(0, 34), 55, y + 5, { width: 175 })
      .text(String(ligne.quantite), 235, y + 5, { width: 35 })
      .text(formatFcfa(ligne.prix_unitaire), 275, y + 5, { width: 80 })
      .text(formatFcfa(ligne.remise || 0), 360, y + 5, { width: 70 })
      .text(formatFcfa(ligne.sous_total), 440, y + 5, { width: 95 });
    y += 20;
  });

  doc.y = y + 16;
  const remiseGlobale = Number(facture.remise_globale || 0);
  const total = Number(facture.montant_total || 0);
  doc.fontSize(11).fillColor('#000000');
  if (remiseGlobale > 0) doc.text(`Remise globale : -${formatFcfa(remiseGlobale)}`, { align: 'right' });
  doc.fontSize(14).fillColor('#FF2D7B').text(`Total TTC : ${formatFcfa(total)}`, { align: 'right' });

  doc.moveDown(2);
  doc.fontSize(9).fillColor('#888888').text('Merci pour votre confiance — 100PLUSSHOP', { align: 'center' });

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  const cheminRelatif = `/factures/${nomFichier}`;
  await pool.query('UPDATE facture SET chemin_pdf = ? WHERE id_facture = ?', [cheminRelatif, id]);
  return { cheminRelatif, cheminFichier, nomFichier };
}

module.exports = {
  listerFactures,
  obtenirFacture,
  creerFactureDepuisVente,
  modifierStatutFacture,
  resumeFactures,
  genererPdfFacture,
};
