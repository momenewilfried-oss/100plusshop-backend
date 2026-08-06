const pool = require('../config/database');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function rapportComptable({ debut, fin } = {}) {
  const d0 =
    debut || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const d1 = fin || new Date().toISOString().slice(0, 10);

  const [recettes] = await pool.query(
    `SELECT COALESCE(SUM(montant_total), 0) AS total
     FROM vente
     WHERE statut = 'validee'
       AND DATE(date_vente) BETWEEN ? AND ?`,
    [d0, d1]
  );

  const [depenses] = await pool.query(
    `SELECT COALESCE(SUM(montant), 0) AS total
     FROM depense
     WHERE DATE(date_depense) BETWEEN ? AND ?`,
    [d0, d1]
  );

  const [achats] = await pool.query(
    `SELECT COALESCE(SUM(montant_total), 0) AS total
     FROM facture_achat
     WHERE DATE(date_achat) BETWEEN ? AND ?`,
    [d0, d1]
  );

  const [caJour] = await pool.query(
    `SELECT DATE(date_vente) AS jour, COALESCE(SUM(montant_total), 0) AS ca
     FROM vente
     WHERE statut = 'validee' AND DATE(date_vente) BETWEEN ? AND ?
     GROUP BY DATE(date_vente)
     ORDER BY jour`,
    [d0, d1]
  );

  const [top] = await pool.query(
    `SELECT p.nom, p.reference, SUM(dv.quantite) AS qte, SUM(dv.sous_total) AS ca
     FROM detail_vente dv
     JOIN vente v ON dv.id_vente = v.id_vente
     JOIN variante var ON dv.id_variante = var.id_variante
     JOIN produit p ON var.id_produit = p.id_produit
     WHERE v.statut = 'validee' AND DATE(v.date_vente) BETWEEN ? AND ?
     GROUP BY p.id_produit
     ORDER BY ca DESC
     LIMIT 10`,
    [d0, d1]
  );

  const [depParCat] = await pool.query(
    `SELECT categorie, COALESCE(SUM(montant), 0) AS total
     FROM depense
     WHERE DATE(date_depense) BETWEEN ? AND ?
     GROUP BY categorie
     ORDER BY total DESC`,
    [d0, d1]
  );

  const totalRecettes = Number(recettes[0].total);
  const totalDepenses = Number(depenses[0].total);
  const totalAchats = Number(achats[0].total);
  const benefice = totalRecettes - totalDepenses - totalAchats;

  return {
    periode: { debut: d0, fin: d1 },
    recettes: totalRecettes,
    depenses: totalDepenses,
    achats_fournisseurs: totalAchats,
    benefice,
    ca_par_jour: caJour,
    top_produits: top,
    depenses_par_categorie: depParCat,
  };
}

async function exportRapportExcel({ debut, fin } = {}) {
  const d0 =
    debut || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const d1 = fin || new Date().toISOString().slice(0, 10);

  const [recettes] = await pool.query(`SELECT COALESCE(SUM(montant_total), 0) AS total FROM vente WHERE statut = 'validee' AND DATE(date_vente) BETWEEN ? AND ?`, [d0, d1]);
  const [depenses] = await pool.query(`SELECT COALESCE(SUM(montant), 0) AS total FROM depense WHERE DATE(date_depense) BETWEEN ? AND ?`, [d0, d1]);
  const [achats] = await pool.query(`SELECT COALESCE(SUM(montant_total), 0) AS total FROM facture_achat WHERE DATE(date_achat) BETWEEN ? AND ?`, [d0, d1]);
  const [caJour] = await pool.query(`SELECT DATE(date_vente) AS jour, COALESCE(SUM(montant_total), 0) AS ca FROM vente WHERE statut = 'validee' AND DATE(date_vente) BETWEEN ? AND ? GROUP BY DATE(date_vente) ORDER BY jour`, [d0, d1]);
  const [top] = await pool.query(`SELECT p.nom, p.reference, SUM(dv.quantite) AS qte, SUM(dv.sous_total) AS ca FROM detail_vente dv JOIN vente v ON dv.id_vente = v.id_vente JOIN variante var ON dv.id_variante = var.id_variante JOIN produit p ON var.id_produit = p.id_produit WHERE v.statut = 'validee' AND DATE(v.date_vente) BETWEEN ? AND ? GROUP BY p.id_produit ORDER BY ca DESC LIMIT 15`, [d0, d1]);
  const [depParCat] = await pool.query(`SELECT categorie, COALESCE(SUM(montant), 0) AS total FROM depense WHERE DATE(date_depense) BETWEEN ? AND ? GROUP BY categorie ORDER BY total DESC`, [d0, d1]);

  const totalRecettes = Number(recettes[0].total);
  const totalDepenses = Number(depenses[0].total);
  const totalAchats = Number(achats[0].total);
  const benefice = totalRecettes - totalDepenses - totalAchats;

  const ROSE = 'FFFF2D7B';
  const NOIR = 'FF1A1A2E';
  const BLANC = 'FFFFFFFF';
  const GRIS = 'FFF4F5F7';

  const wb = new ExcelJS.Workbook();
  wb.creator = '100PLUSSHOP';
  wb.created = new Date();

  const ws = wb.addWorksheet('Rapport comptable', { views: [{ showGridLines: false }], properties: { defaultRowHeight: 18 } });
  ws.columns = [ { key: 'a', width: 32 }, { key: 'b', width: 18 }, { key: 'c', width: 16 }, { key: 'd', width: 16 }, { key: 'e', width: 18 } ];

  const logoPath = [
    path.join(__dirname, '../../public/logo_100plus.jpg.jpeg'),
    path.join(__dirname, '../../public/logo_100plus.jpg'),
    path.join(__dirname, '../../public/logo.png'),
  ].find((p) => fs.existsSync(p));

  if (logoPath) {
    try {
      const imgId = wb.addImage({ filename: logoPath, extension: logoPath.endsWith('.png') ? 'png' : 'jpeg' });
      ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 90, height: 90 } });
    } catch (err) {
      // ignore logo errors
    }
  }

  ws.mergeCells('C1', 'E1');
  ws.getCell('C1').value = '100PLUSSHOP';
  ws.getCell('C1').font = { name: 'Calibri', size: 22, bold: true, color: { argb: ROSE } };
  ws.getCell('C1').alignment = { vertical: 'middle' };
  ws.mergeCells('C2', 'E2');
  ws.getCell('C2').value = 'Rapport comptable';
  ws.getCell('C2').font = { name: 'Calibri', size: 14, bold: true, color: { argb: NOIR } };
  ws.mergeCells('C3', 'E3');
  ws.getCell('C3').value = `Période : ${d0} → ${d1}  |  Devise : FCFA`;
  ws.getCell('C3').font = { name: 'Calibri', size: 11, color: { argb: 'FF6B7280' } };
  ws.mergeCells('C4', 'E4');
  ws.getCell('C4').value = `Généré le ${new Date().toLocaleString('fr-FR')}`;
  ws.getCell('C4').font = { name: 'Calibri', size: 10, color: { argb: 'FF6B7280' } };

  let row = 7;
  const styleHeader = (cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROSE } };
    cell.font = { name: 'Calibri', bold: true, color: { argb: BLANC }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  };
  const styleTitle = (r) => {
    ws.mergeCells(`A${r}`, `B${r}`);
    ws.getCell(`A${r}`).font = { name: 'Calibri', bold: true, size: 13, color: { argb: NOIR } };
  };

  styleTitle(row);
  ws.getCell(`A${row}`).value = '1. Synthèse';
  row += 1;
  ws.getCell(`A${row}`).value = 'Indicateur';
  ws.getCell(`B${row}`).value = 'Montant (FCFA)';
  styleHeader(ws.getCell(`A${row}`));
  styleHeader(ws.getCell(`B${row}`));
  row += 1;

  const synthese = [ ['Recettes (ventes validées)', totalRecettes], ['Dépenses', totalDepenses], ['Achats fournisseurs', totalAchats], ['Bénéfice', benefice] ];
  synthese.forEach(([label, val], i) => {
    ws.getCell(`A${row}`).value = label;
    ws.getCell(`B${row}`).value = val;
    ws.getCell(`B${row}`).numFmt = '#,##0';
    if (i % 2 === 0) {
      ws.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS } };
      ws.getCell(`B${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS } };
    }
    if (label === 'Bénéfice') {
      ws.getCell(`A${row}`).font = { name: 'Calibri', bold: true, color: { argb: ROSE } };
      ws.getCell(`B${row}`).font = { name: 'Calibri', bold: true, color: { argb: ROSE } };
    }
    row += 1;
  });

  // Additional sheets/sections omitted for brevity: keep primary excel generation consistent

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `100plusshop_rapport_${d0}_${d1}.xlsx`;
  return { buffer, filename };
}

module.exports = { rapportComptable, exportRapportExcel };
