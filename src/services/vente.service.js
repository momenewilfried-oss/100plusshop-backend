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
  if (!lignes || lignes.length === 0) throw new ApiError(400, 'La vente doit contenir au moins une ligne');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. vérifier le stock
    for (const ligne of lignes) {
      const variante = await venteRepository.getVariantForUpdate(connection, ligne.idVariante);
      if (!variante) throw new ApiError(409, `Variante ${ligne.idVariante} introuvable`);
      if (variante.stock < ligne.quantite) {
        throw new ApiError(409, `Stock insuffisant pour la variante ${ligne.idVariante} (disponible: ${variante.stock}, demandé: ${ligne.quantite})`);
      }
    }

    // 2. calculs
    const lignesCalculees = [];
    let montantTotal = 0;
    for (const ligne of lignes) {
      const promo = await promoActivePourVariante(connection, ligne.idVariante);
      const remise = calculerRemiseLigne(ligne.prixUnitaire, ligne.quantite, ligne.remise, promo);
      const sousTotal = Number(ligne.prixUnitaire) * Number(ligne.quantite) - remise;
      montantTotal += sousTotal;
      lignesCalculees.push({
        idVariante: ligne.idVariante,
        quantite: ligne.quantite,
        prixUnitaire: ligne.prixUnitaire,
        remise,
        sousTotal,
        promoAppliquee: promo ? promo.nom : null,
      });
    }

    montantTotal -= Number(remiseGlobale || 0);
    if (montantTotal < 0) montantTotal = 0;

    // 3. créer la vente
    const idVente = await venteRepository.insertSale(connection, {
      idVendeur,
      idClient,
      remiseGlobale,
      montantTotal,
      modePaiementPrincipal,
    });

    // 4. détails + stock + mouvement
    for (const ligne of lignesCalculees) {
      await venteRepository.insertDetail(connection, {
        idVente,
        idVariante: ligne.idVariante,
        quantite: ligne.quantite,
        prixUnitaire: ligne.prixUnitaire,
        remise: ligne.remise,
        sousTotal: ligne.sousTotal,
      });

      await venteRepository.adjustVariantStock(connection, ligne.idVariante, -Number(ligne.quantite));

      await venteRepository.insertStockMovement(connection, {
        variante: ligne.idVariante,
        typeMouvement: 'sortie',
        quantite: ligne.quantite,
        motif: 'vente',
        documentType: 'vente',
        documentId: idVente,
      });
    }

    await connection.commit();
    await logAction({
      userId: idVendeur || null,
      module: 'vente',
      action: 'CREATE',
      newValue: { idVente: typeof idVente !== 'undefined' ? idVente : null },
    });

    const venteFinale = await venteRepository.getSaleFinal(pool, idVente);
    const detailsFinaux = await venteRepository.getSaleDetailsFinal(pool, idVente);

    return {
      ...venteFinale,
      details: detailsFinaux,
      promos: lignesCalculees
        .filter((l) => l.promoAppliquee)
        .map((l) => ({ idVariante: l.idVariante, promo: l.promoAppliquee, remise: l.remise })),
    };
  } catch (erreur) {
    await connection.rollback();
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

module.exports = { listerVentes, obtenirVente, creerVente, annulerVente };