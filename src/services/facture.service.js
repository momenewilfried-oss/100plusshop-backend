const { ApiError } = require('../utils/error-handler');
const { logAction } = require('./audit.service');
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

async function creerFactureDepuisVente({ idVente, statut }, user = null) {
  if (!idVente) throw new ApiError(400, 'idVente obligatoire');

  // 1) Vente (sans FOR UPDATE : compatible pooler Supabase transaction mode)
  const [ventes] = await pool.query('SELECT * FROM vente WHERE id_vente = ?', [idVente]);
  if (!ventes || ventes.length === 0) {
    throw new ApiError(404, 'Vente introuvable');
  }
  const vente = ventes[0];
  if (String(vente.statut).toLowerCase() === 'annulee') {
    throw new ApiError(409, 'Impossible de facturer une vente annulée');
  }

  // 2) Idempotent : facture déjà liée à cette vente
  const [existantes] = await pool.query(
    'SELECT * FROM facture WHERE id_vente = ? ORDER BY id_facture DESC LIMIT 1',
    [idVente]
  );
  if (existantes && existantes.length > 0) {
    return existantes[0];
  }

  const numero = genererNumero();
  const montant = Number(vente.montant_total) || 0;
  const st = statut || 'Payée';

  // 3) INSERT avec RETURNING explicite (PostgreSQL)
  let idFacture = null;
  let row = null;
  try {
    const [result] = await pool.query(
      `INSERT INTO facture (numero, date_facture, id_vente, montant_total, statut)
       VALUES (?, NOW(), ?, ?, ?)`,
      [numero, idVente, montant, st]
    );
    // result peut être tableau de rows + insertId (wrapper mysql-compatible)
    if (Array.isArray(result) && result[0] && result[0].id_facture != null) {
      row = result[0];
      idFacture = Number(result[0].id_facture);
    } else if (result && result.insertId) {
      idFacture = Number(result.insertId);
    } else if (result && result[0]) {
      row = result[0];
      idFacture = Number(result[0].id_facture);
    }
  } catch (e) {
    // Course : une autre requête a créé la facture entre-temps (UNIQUE id_vente)
    const msg = String(e.message || e);
    if (/unique|duplicate|id_vente/i.test(msg)) {
      const [again] = await pool.query(
        'SELECT * FROM facture WHERE id_vente = ? ORDER BY id_facture DESC LIMIT 1',
        [idVente]
      );
      if (again && again.length) return again[0];
    }
    throw e;
  }

  // 4) Fallback : recharger par numéro si id manquant
  if (!row) {
    const [byNum] = await pool.query('SELECT * FROM facture WHERE numero = ?', [numero]);
    if (byNum && byNum.length) {
      row = byNum[0];
      idFacture = Number(row.id_facture);
    }
  }
  if (!row && idFacture) {
    const [byId] = await pool.query('SELECT * FROM facture WHERE id_facture = ?', [idFacture]);
    row = byId[0] || null;
  }

  if (!row) {
    // Dernier recours : par id_vente
    const [byV] = await pool.query('SELECT * FROM facture WHERE id_vente = ? LIMIT 1', [idVente]);
    if (byV && byV.length) return byV[0];
    throw new ApiError(500, 'INSERT facture: enregistrement non retrouvé après insertion');
  }

  try {
    await logAction({
      userId: user?.id || null,
      module: 'facture',
      action: 'CREATE',
      newValue: {
        id_facture: Number(row.id_facture),
        id_vente: Number(idVente),
        numero: row.numero,
        montant_total: row.montant_total,
        statut: row.statut,
      },
    });
  } catch (_) {
    /* audit non bloquant */
  }

  return row;
}

async function modifierStatutFacture(id, statut, user = null) {
  const statutsValides = ['Payée', 'En attente', 'Retard', 'Brouillon', 'Annulée'];
  if (!statut || !statutsValides.includes(statut)) {
    throw new ApiError(400, `Statut invalide. Valeurs possibles : ${statutsValides.join(', ')}`);
  }
  const [result] = await pool.query('UPDATE facture SET statut = ? WHERE id_facture = ?', [statut, id]);
  if (result.affectedRows === 0) throw new ApiError(404, 'Facture introuvable');
  const [facture] = await pool.query('SELECT * FROM facture WHERE id_facture = ?', [id]);
  const row = facture[0];
  await logAction({
    userId: user?.id || null,
    module: 'facture',
    action: 'STATUS',
    newValue: { id_facture: Number(id), statut },
  });
  return row;
}

async function resumeFactures() {
  const [total] = await pool.query('SELECT COUNT(*) AS total FROM facture');
  const [payees] = await pool.query(`
    SELECT COALESCE(SUM(montant_total), 0) AS recettes
    FROM facture WHERE statut = 'Payée'
      AND date_facture >= date_trunc('month', CURRENT_DATE)
      AND date_facture < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
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
  let PDFDocument;
  try {
    PDFDocument = require('pdfkit');
  } catch (e) {
    throw new ApiError(
      500,
      'Module pdfkit absent sur le serveur. Exécutez : npm install pdfkit'
    );
  }

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
  if (!factures || factures.length === 0) {
    throw new ApiError(404, 'Facture introuvable');
  }
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
    details = lignes || [];
  }

  // Format ticket caisse ~80 mm de large (226 pt)
  const TICKET_W = 226;
  const marginX = 12;
  const contentW = TICKET_W - marginX * 2;
  // Hauteur dynamique selon le nombre de lignes
  const baseH = 220;
  const lineH = 28;
  const TICKET_H = Math.max(400, baseH + details.length * lineH + 80);

  const nomFichier = `${String(facture.numero || 'ticket').replace(/[^\w.-]+/g, '_')}.pdf`;

  const doc = new PDFDocument({
    size: [TICKET_W, TICKET_H],
    margin: marginX,
  });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const pdfDone = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const center = (text, opts = {}) => {
    doc.text(text, marginX, doc.y, {
      width: contentW,
      align: 'center',
      ...opts,
    });
  };

  const line = (ch = '-') => {
    doc
      .fontSize(9)
      .fillColor('#333333')
      .text(ch.repeat(32), marginX, doc.y, { width: contentW, align: 'center' });
  };

  // ——— En-tête boutique ———
  doc.fontSize(14).fillColor('#000000');
  center('100PLUSSHOP');
  doc.moveDown(0.15);
  doc.fontSize(8).fillColor('#444444');
  center('Ticket de caisse');
  doc.moveDown(0.3);
  line('=');

  const dateFacture = facture.date_facture
    ? new Date(facture.date_facture).toLocaleString('fr-FR')
    : '-';
  doc.fontSize(8).fillColor('#000000');
  doc.text(`N° ${facture.numero || '-'}`, marginX, doc.y, { width: contentW });
  doc.text(`Date ${dateFacture}`, marginX, doc.y, { width: contentW });
  doc.text(`Paiement : ${facture.mode_paiement_principal || '-'}`, marginX, doc.y, {
    width: contentW,
  });
  if (facture.client_nom) {
    doc.text(
      `Client : ${`${facture.client_prenom || ''} ${facture.client_nom}`.trim()}`,
      marginX,
      doc.y,
      { width: contentW }
    );
  } else {
    doc.text('Client : Anonyme', marginX, doc.y, { width: contentW });
  }
  doc.moveDown(0.2);
  line('-');

  // ——— Articles ———
  doc.fontSize(8).fillColor('#000000');
  for (const l of details) {
    const nom = `${l.produit_nom || 'Article'}`.trim();
    const varTxt = [l.taille, l.couleur].filter(Boolean).join(' ');
    const titre = varTxt ? `${nom} (${varTxt})` : nom;
    doc.text(titre.substring(0, 36), marginX, doc.y, { width: contentW });
    const qte = Number(l.quantite) || 0;
    const pu = formatFcfa(l.prix_unitaire);
    const st = formatFcfa(l.sous_total);
    doc.text(`${qte} x ${pu}`, marginX, doc.y, { width: contentW * 0.55, continued: true });
    doc.text(st, { width: contentW * 0.45, align: 'right' });
    if (Number(l.remise) > 0) {
      doc.fillColor('#666666').text(`  remise -${formatFcfa(l.remise)}`, marginX, doc.y, {
        width: contentW,
      });
      doc.fillColor('#000000');
    }
    doc.moveDown(0.15);
  }

  line('-');
  const remiseGlobale = Number(facture.remise_globale || 0);
  const total = Number(facture.montant_total || 0);
  if (remiseGlobale > 0) {
    doc.fontSize(8);
    doc.text(`Remise globale`, marginX, doc.y, { width: contentW * 0.55, continued: true });
    doc.text(`-${formatFcfa(remiseGlobale)}`, { width: contentW * 0.45, align: 'right' });
  }
  doc.moveDown(0.15);
  doc.fontSize(11).fillColor('#000000');
  doc.text('TOTAL', marginX, doc.y, { width: contentW * 0.45, continued: true });
  doc.text(formatFcfa(total), { width: contentW * 0.55, align: 'right' });
  doc.moveDown(0.35);
  line('=');
  doc.fontSize(8).fillColor('#333333');
  center('Merci de votre visite !');
  center('100PLUSSHOP');
  doc.moveDown(0.2);
  doc.fontSize(7).fillColor('#888888');
  center(String(facture.statut || ''));

  doc.end();
  const buffer = await pdfDone;

  try {
    await pool.query('UPDATE facture SET chemin_pdf = ? WHERE id_facture = ?', [
      `ticket://${nomFichier}`,
      id,
    ]);
  } catch (_) {}

  return { buffer, nomFichier, contentType: 'application/pdf' };
}

module.exports = {
  listerFactures,
  obtenirFacture,
  creerFactureDepuisVente,
  modifierStatutFacture,
  resumeFactures,
  genererPdfFacture,
};
