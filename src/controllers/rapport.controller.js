const pool = require('../config/database');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function rapportComptable(req, res) {
  try {
    const { debut, fin } = req.query;
    const d0 =
      debut ||
      new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .slice(0, 10);
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

    res.json({
      periode: { debut: d0, fin: d1 },
      recettes: totalRecettes,
      depenses: totalDepenses,
      achats_fournisseurs: totalAchats,
      benefice,
      ca_par_jour: caJour,
      top_produits: top,
      depenses_par_categorie: depParCat,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur', erreur: e.message });
  }
}

async function exportRapportExcel(req, res) {
  try {
    const { debut, fin } = req.query;
    const d0 =
      debut ||
      new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .slice(0, 10);
    const d1 = fin || new Date().toISOString().slice(0, 10);

    const [recettes] = await pool.query(
      `SELECT COALESCE(SUM(montant_total), 0) AS total FROM vente
       WHERE statut = 'validee' AND DATE(date_vente) BETWEEN ? AND ?`,
      [d0, d1]
    );
    const [depenses] = await pool.query(
      `SELECT COALESCE(SUM(montant), 0) AS total FROM depense
       WHERE DATE(date_depense) BETWEEN ? AND ?`,
      [d0, d1]
    );
    const [achats] = await pool.query(
      `SELECT COALESCE(SUM(montant_total), 0) AS total FROM facture_achat
       WHERE DATE(date_achat) BETWEEN ? AND ?`,
      [d0, d1]
    );
    const [caJour] = await pool.query(
      `SELECT DATE(date_vente) AS jour, COALESCE(SUM(montant_total), 0) AS ca
       FROM vente
       WHERE statut = 'validee' AND DATE(date_vente) BETWEEN ? AND ?
       GROUP BY DATE(date_vente) ORDER BY jour`,
      [d0, d1]
    );
    const [top] = await pool.query(
      `SELECT p.nom, p.reference, SUM(dv.quantite) AS qte, SUM(dv.sous_total) AS ca
       FROM detail_vente dv
       JOIN vente v ON dv.id_vente = v.id_vente
       JOIN variante var ON dv.id_variante = var.id_variante
       JOIN produit p ON var.id_produit = p.id_produit
       WHERE v.statut = 'validee' AND DATE(v.date_vente) BETWEEN ? AND ?
       GROUP BY p.id_produit ORDER BY ca DESC LIMIT 15`,
      [d0, d1]
    );
    const [depParCat] = await pool.query(
      `SELECT categorie, COALESCE(SUM(montant), 0) AS total FROM depense
       WHERE DATE(date_depense) BETWEEN ? AND ?
       GROUP BY categorie ORDER BY total DESC`,
      [d0, d1]
    );

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

    const ws = wb.addWorksheet('Rapport comptable', {
      views: [{ showGridLines: false }],
      properties: { defaultRowHeight: 18 },
    });

    ws.columns = [
      { key: 'a', width: 32 },
      { key: 'b', width: 18 },
      { key: 'c', width: 16 },
      { key: 'd', width: 16 },
      { key: 'e', width: 18 },
    ];

    const logoPath = [
      path.join(__dirname, '../../public/logo_100plus.jpg.jpeg'),
      path.join(__dirname, '../../public/logo_100plus.jpg'),
      path.join(__dirname, '../../public/logo.png'),
    ].find((p) => fs.existsSync(p));

    if (logoPath) {
      try {
        const imgId = wb.addImage({
          filename: logoPath,
          extension: logoPath.endsWith('.png') ? 'png' : 'jpeg',
        });
        ws.addImage(imgId, {
          tl: { col: 0, row: 0 },
          ext: { width: 90, height: 90 },
        });
      } catch (err) {
        console.error('Logo Excel:', err.message);
      }
    }

    ws.mergeCells('C1', 'E1');
    ws.getCell('C1').value = '100PLUSSHOP';
    ws.getCell('C1').font = {
      name: 'Calibri',
      size: 22,
      bold: true,
      color: { argb: ROSE },
    };
    ws.getCell('C1').alignment = { vertical: 'middle' };

    ws.mergeCells('C2', 'E2');
    ws.getCell('C2').value = 'Rapport comptable';
    ws.getCell('C2').font = {
      name: 'Calibri',
      size: 14,
      bold: true,
      color: { argb: NOIR },
    };

    ws.mergeCells('C3', 'E3');
    ws.getCell('C3').value = `Période : ${d0} → ${d1}  |  Devise : FCFA`;
    ws.getCell('C3').font = {
      name: 'Calibri',
      size: 11,
      color: { argb: 'FF6B7280' },
    };

    ws.mergeCells('C4', 'E4');
    ws.getCell('C4').value = `Généré le ${new Date().toLocaleString('fr-FR')}`;
    ws.getCell('C4').font = {
      name: 'Calibri',
      size: 10,
      color: { argb: 'FF6B7280' },
    };

    let row = 7;

    const styleHeader = (cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: ROSE },
      };
      cell.font = {
        name: 'Calibri',
        bold: true,
        color: { argb: BLANC },
        size: 11,
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    };

    const styleTitle = (r) => {
      ws.mergeCells(`A${r}`, `B${r}`);
      ws.getCell(`A${r}`).font = {
        name: 'Calibri',
        bold: true,
        size: 13,
        color: { argb: NOIR },
      };
    };

    // --- Synthèse ---
    styleTitle(row);
    ws.getCell(`A${row}`).value = '1. Synthèse';
    row += 1;

    ws.getCell(`A${row}`).value = 'Indicateur';
    ws.getCell(`B${row}`).value = 'Montant (FCFA)';
    styleHeader(ws.getCell(`A${row}`));
    styleHeader(ws.getCell(`B${row}`));
    row += 1;

    const synthese = [
      ['Recettes (ventes validées)', totalRecettes],
      ['Dépenses', totalDepenses],
      ['Achats fournisseurs', totalAchats],
      ['Bénéfice', benefice],
    ];

    synthese.forEach(([label, val], i) => {
      ws.getCell(`A${row}`).value = label;
      ws.getCell(`B${row}`).value = val;
      ws.getCell(`B${row}`).numFmt = '#,##0';
      if (i % 2 === 0) {
        ws.getCell(`A${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: GRIS },
        };
        ws.getCell(`B${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: GRIS },
        };
      }
      if (label === 'Bénéfice') {
        ws.getCell(`A${row}`).font = {
          name: 'Calibri',
          bold: true,
          color: { argb: ROSE },
        };
        ws.getCell(`B${row}`).font = {
          name: 'Calibri',
          bold: true,
          color: { argb: ROSE },
        };
      }
      row += 1;
    });

    // --- CA par jour ---
    row += 1;
    styleTitle(row);
    ws.getCell(`A${row}`).value = "2. Chiffre d'affaires par jour";
    row += 1;

    ['Date', 'CA (FCFA)'].forEach((h, i) => {
      const cell = ws.getCell(row, i + 1);
      cell.value = h;
      styleHeader(cell);
    });
    row += 1;

    (caJour || []).forEach((r, i) => {
      ws.getCell(`A${row}`).value = r.jour
        ? new Date(r.jour).toLocaleDateString('fr-FR')
        : '';
      ws.getCell(`B${row}`).value = Number(r.ca);
      ws.getCell(`B${row}`).numFmt = '#,##0';
      if (i % 2 === 0) {
        ws.getCell(`A${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: GRIS },
        };
        ws.getCell(`B${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: GRIS },
        };
      }
      row += 1;
    });

    // --- Top produits ---
    row += 1;
    styleTitle(row);
    ws.getCell(`A${row}`).value = '3. Top produits';
    row += 1;

    ['Produit', 'Référence', 'Quantité', 'CA (FCFA)'].forEach((h, i) => {
      const cell = ws.getCell(row, i + 1);
      cell.value = h;
      styleHeader(cell);
    });
    row += 1;

    (top || []).forEach((r, i) => {
      ws.getCell(`A${row}`).value = r.nom || '';
      ws.getCell(`B${row}`).value = r.reference || '';
      ws.getCell(`C${row}`).value = Number(r.qte || 0);
      ws.getCell(`D${row}`).value = Number(r.ca || 0);
      ws.getCell(`D${row}`).numFmt = '#,##0';
      if (i % 2 === 0) {
        for (let c = 1; c <= 4; c++) {
          ws.getCell(row, c).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: GRIS },
          };
        }
      }
      row += 1;
    });

    // --- Dépenses par catégorie ---
    row += 1;
    styleTitle(row);
    ws.getCell(`A${row}`).value = '4. Dépenses par catégorie';
    row += 1;

    ['Catégorie', 'Total (FCFA)'].forEach((h, i) => {
      const cell = ws.getCell(row, i + 1);
      cell.value = h;
      styleHeader(cell);
    });
    row += 1;

    (depParCat || []).forEach((r, i) => {
      ws.getCell(`A${row}`).value = r.categorie || '';
      ws.getCell(`B${row}`).value = Number(r.total || 0);
      ws.getCell(`B${row}`).numFmt = '#,##0';
      if (i % 2 === 0) {
        ws.getCell(`A${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: GRIS },
        };
        ws.getCell(`B${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: GRIS },
        };
      }
      row += 1;
    });

    row += 2;
    ws.getCell(`A${row}`).value =
      '100PLUSSHOP — Document généré automatiquement';
    ws.getCell(`A${row}`).font = {
      name: 'Calibri',
      size: 9,
      italic: true,
      color: { argb: 'FF9CA3AF' },
    };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=100plusshop_rapport_${d0}_${d1}.xlsx`
    );

    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur export Excel', erreur: e.message });
  }
}

module.exports = { rapportComptable, exportRapportExcel };