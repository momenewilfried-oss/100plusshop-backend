
const { ApiError } = require('../utils/error-handler');
const venteRepository = require('../repositories/vente.repository');
const pool = require('../config/database');
const { logAction } = require('./audit.service');

function calculerRemiseLigne(prixUnitaire, quantite, remiseManuelle, promo) {
  if (remiseManuelle != null && Number(remiseManuelle) > 0) {
    return Number(remiseManuelle);
  }
  if (!promo) return 0;
  const base = Number(prixUnitaire) * Number(quantite);
  if (promo.type === 'pourcentage') {
    return (base * Number(promo.valeur)) / 100;
  }
  if (promo.type === 'montant') {
    return Number(promo.valeur) * Number(quantite);
  }
  return 0;
}

async function promoActivePourVariante(db, idVariante) {
  const promo = await venteRepository.getPromoForVariant(db, idVariante);
  return promo || null;
}

async function listerVentes() {
  return venteRepository.listSales();
}

async function obtenirVente(id) {
  const vente = await venteRepository.getSaleById(id);
  if (!vente) throw new ApiError(404, 'Vente introuvable');
  const details = await venteRepository.getSaleDetails(id);
  return { ...vente, details };
}

async function creerVente({ idClient, remiseGlobale, modePaiementPrincipal, lignes }, currentUser) {
  const idVendeur = currentUser.id;
  if (!lignes || lignes.length === 0) {
    throw new ApiError(400, 'La vente doit contenir au moins une ligne');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const ids = lignes.map((l) => Number(l.idVariante));

    // 1) Stock : 1 seule requête pour toutes les variantes
    const variantes = await venteRepository.getVariantsByIds(connection, ids);
    const stockMap = {};
    for (const v of variantes) stockMap[Number(v.id_variante)] = v;

    for (const ligne of lignes) {
      const idV = Number(ligne.idVariante);
      const variante = stockMap[idV];
      if (!variante) {
        throw new ApiError(409, `Variante ${idV} introuvable`);
      }
      if (Number(variante.stock) < Number(ligne.quantite)) {
        throw new ApiError(
          409,
          `Stock insuffisant pour la variante ${idV} (disponible: ${variante.stock}, demandé: ${ligne.quantite})`
        );
      }
    }

    // 2) Promos : 1 seule requête
    let promoMap = {};
    try {
      promoMap = await venteRepository.getPromosForVariants(connection, ids);
    } catch (_) {
      promoMap = {};
    }

    // 3) Calculs en mémoire
    const lignesCalculees = [];
    let montantTotal = 0;
    for (const ligne of lignes) {
      const idV = Number(ligne.idVariante);
      const promo = promoMap[idV] || null;
      const remise = calculerRemiseLigne(
        ligne.prixUnitaire,
        ligne.quantite,
        ligne.remise,
        promo
      );
      const sousTotal =
        Number(ligne.prixUnitaire) * Number(ligne.quantite) - remise;
      montantTotal += sousTotal;
      lignesCalculees.push({
        idVariante: idV,
        quantite: Number(ligne.quantite),
        prixUnitaire: Number(ligne.prixUnitaire),
        remise,
        sousTotal,
        promoAppliquee: promo ? promo.nom : null,
      });
    }

    montantTotal -= Number(remiseGlobale || 0);
    if (montantTotal < 0) montantTotal = 0;

    // 4) INSERT vente
    const idVente = await venteRepository.insertSale(connection, {
      idVendeur,
      idClient,
      remiseGlobale,
      montantTotal,
      modePaiementPrincipal,
    });

    // 5) Détails + stock + mouvements
    for (const ligne of lignesCalculees) {
      await venteRepository.insertDetail(connection, {
        idVente,
        idVariante: ligne.idVariante,
        quantite: ligne.quantite,
        prixUnitaire: ligne.prixUnitaire,
        remise: ligne.remise,
        sousTotal: ligne.sousTotal,
      });
      await venteRepository.adjustVariantStock(
        connection,
        ligne.idVariante,
        -Number(ligne.quantite)
      );
      await venteRepository.insertStockMovement(connection, {
        variante: ligne.idVariante,
        typeMouvement: 'sortie',
        quantite: ligne.quantite,
        motif: 'vente',
        documentType: 'vente',
        documentId: idVente,
      });
    }

    // 6) Facture dans la MÊME transaction (évite 2e connexion + latence)
    const numero =
      'FACT-' +
      new Date().toISOString().slice(0, 10).replace(/-/g, '') +
      '-' +
      String(Math.floor(1000 + Math.random() * 9000));
    let factureRow = null;
    try {
      const [exist] = await connection.query(
        'SELECT * FROM facture WHERE id_vente = ? LIMIT 1',
        [idVente]
      );
      if (exist && exist.length) {
        factureRow = exist[0];
      } else {
        const [ins] = await connection.query(
          `INSERT INTO facture (numero, date_facture, id_vente, montant_total, statut)
           VALUES (?, NOW(), ?, ?, ?)`,
          [numero, idVente, montantTotal, 'Payée']
        );
        const idFacture = Number(
          ins.insertId ?? ins[0]?.id_facture ?? ins.rows?.[0]?.id_facture
        );
        if (idFacture) {
          factureRow = {
            id_facture: idFacture,
            numero,
            id_vente: idVente,
            montant_total: montantTotal,
            statut: 'Payée',
          };
        } else {
          const [byNum] = await connection.query(
            'SELECT * FROM facture WHERE numero = ? LIMIT 1',
            [numero]
          );
          factureRow = byNum[0] || null;
        }
      }
    } catch (e) {
      console.error('[vente] facture dans TX:', e.message);
      // ne fait pas échouer la vente
    }

    await connection.commit();

    // Audit non bloquant (ne retarde pas la réponse POS)
    Promise.resolve(
      logAction({
        userId: idVendeur || null,
        module: 'vente',
        action: 'CREATE',
        newValue: {
          idVente,
          montant_total: montantTotal,
          id_facture: factureRow?.id_facture || null,
        },
      })
    ).catch(() => {});

    return {
      id_vente: idVente,
      montant_total: montantTotal,
      remise_globale: Number(remiseGlobale || 0),
      mode_paiement_principal: modePaiementPrincipal,
      id_client: idClient || null,
      id_vendeur: idVendeur,
      statut: 'validee',
      details: lignesCalculees.map((l) => ({
        id_variante: l.idVariante,
        quantite: l.quantite,
        prix_unitaire: l.prixUnitaire,
        remise: l.remise,
        sous_total: l.sousTotal,
      })),
      facture: factureRow,
      promos: lignesCalculees
        .filter((l) => l.promoAppliquee)
        .map((l) => ({
          idVariante: l.idVariante,
          promo: l.promoAppliquee,
          remise: l.remise,
        })),
    };
  } catch (erreur) {
    try {
      await connection.rollback();
    } catch (_) {}
    throw erreur;
  } finally {
    connection.release();
  }
}

async function annulerVente(id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const vente = await connection.query('SELECT statut FROM vente WHERE id_vente = ? FOR UPDATE', [id]);
    const venteRows = vente[0];
    if (venteRows.length === 0) throw new ApiError(409, 'Vente introuvable');
    if (venteRows[0].statut === 'annulee') throw new ApiError(409, 'Cette vente est déjà annulée');

    const [details] = await connection.query('SELECT id_variante, quantite FROM detail_vente WHERE id_vente = ?', [id]);
    for (const detail of details) {
      await venteRepository.adjustVariantStock(connection, detail.id_variante, Number(detail.quantite));
      await venteRepository.insertStockMovement(connection, {
        variante: detail.id_variante,
        typeMouvement: 'entree',
        quantite: detail.quantite,
        motif: 'retour',
        documentType: 'vente',
        documentId: id,
      });
    }

    await connection.query("UPDATE vente SET statut = 'annulee' WHERE id_vente = ?", [id]);
    await connection.commit();
    await logAction({
      userId: null,
      module: 'vente',
      action: 'ANNULER',
      oldValue: { idVente: id },
    });
    return { message: 'Vente annulée, stock réintégré' };
  } catch (erreur) {
    await connection.rollback();
    throw erreur;
  } finally {
    connection.release();
  }
}
module.exports = { listerVentes, obtenirVente, creerVente, annulerVente }
