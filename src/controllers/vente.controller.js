const pool = require('../config/database');

/** Promo active liée à une variante (snake_case prioritaire, fallback camelCase) */
async function promoActivePourVariante(db, idVariante) {
  try {
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
  } catch {
    const [rows] = await db.query(
      `SELECT p.type, p.valeur, p.nom
       FROM promotion p
       JOIN variante_promotion vp ON vp.promotion = p.idPromotion
       WHERE vp.variante = ?
         AND p.statut = 'active'
         AND p.dateDebut <= NOW()
         AND p.dateFin >= NOW()
       ORDER BY p.valeur DESC
       LIMIT 1`,
      [idVariante]
    );
    return rows[0] || null;
  }
}

/** Calcule la remise d'une ligne (manuelle prioritaire, sinon promo) */
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

async function listerVentes(req, res) {
  try {
    const [resultat] = await pool.query(`
      SELECT v.*,
             u.nom AS vendeur_nom, u.prenom AS vendeur_prenom,
             c.nom AS client_nom, c.prenom AS client_prenom
      FROM vente v
      LEFT JOIN utilisateur u ON v.id_vendeur = u.id_utilisateur
      LEFT JOIN client c ON v.id_client = c.id_client
      ORDER BY v.date_vente DESC
    `);
    res.json(resultat);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message });
  }
}

async function obtenirVente(req, res) {
  try {
    const { id } = req.params;

    const [vente] = await pool.query(
      `SELECT v.*,
              u.nom AS vendeur_nom, u.prenom AS vendeur_prenom,
              c.nom AS client_nom, c.prenom AS client_prenom
       FROM vente v
       LEFT JOIN utilisateur u ON v.id_vendeur = u.id_utilisateur
       LEFT JOIN client c ON v.id_client = c.id_client
       WHERE v.id_vente = ?`,
      [id]
    );

    if (vente.length === 0) {
      return res.status(404).json({ message: 'Vente introuvable' });
    }

    const [details] = await pool.query(
      `SELECT dv.*, var.taille, var.couleur, p.nom AS produit_nom, p.reference
       FROM detail_vente dv
       JOIN variante var ON dv.id_variante = var.id_variante
       JOIN produit p ON var.id_produit = p.id_produit
       WHERE dv.id_vente = ?`,
      [id]
    );

    res.json({ ...vente[0], details });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message });
  }
}

async function creerVente(req, res) {
  const connexionDb = await pool.getConnection();

  try {
    const { idClient, remiseGlobale, modePaiementPrincipal, lignes } = req.body;
    const idVendeur = req.utilisateur.id;

    if (!lignes || lignes.length === 0) {
      connexionDb.release();
      return res.status(400).json({ message: 'La vente doit contenir au moins une ligne' });
    }

    await connexionDb.beginTransaction();

    // 1. Vérifier le stock
    for (const ligne of lignes) {
      const [variante] = await connexionDb.query(
        'SELECT stock FROM variante WHERE id_variante = ? FOR UPDATE',
        [ligne.idVariante]
      );

      if (variante.length === 0) {
        throw new Error(`Variante ${ligne.idVariante} introuvable`);
      }

      if (variante[0].stock < ligne.quantite) {
        throw new Error(
          `Stock insuffisant pour la variante ${ligne.idVariante} (disponible: ${variante[0].stock}, demandé: ${ligne.quantite})`
        );
      }
    }

    // 2. Calculer montants + appliquer promos auto
    const lignesCalculees = [];
    let montantTotal = 0;

    for (const ligne of lignes) {
      const promo = await promoActivePourVariante(connexionDb, ligne.idVariante);
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

    // 3. Créer la vente
    const [venteResultat] = await connexionDb.query(
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

    const idVente = venteResultat.insertId;

    // 4. Détails + stock + mouvement
    for (const ligne of lignesCalculees) {
      await connexionDb.query(
        `INSERT INTO detail_vente
         (id_vente, id_variante, quantite, prix_unitaire, remise, sous_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          idVente,
          ligne.idVariante,
          ligne.quantite,
          ligne.prixUnitaire,
          ligne.remise,
          ligne.sousTotal,
        ]
      );

      await connexionDb.query(
        'UPDATE variante SET stock = stock - ? WHERE id_variante = ?',
        [ligne.quantite, ligne.idVariante]
      );

      await connexionDb.query(
        `INSERT INTO mouvement_stock
         (variante, typeMouvement, quantite, motif, documentType, documentId)
         VALUES (?, 'sortie', ?, 'vente', 'vente', ?)`,
        [ligne.idVariante, ligne.quantite, idVente]
      );
    }

    await connexionDb.commit();

    const [venteFinale] = await pool.query(
      'SELECT * FROM vente WHERE id_vente = ?',
      [idVente]
    );
    const [detailsFinaux] = await pool.query(
      'SELECT * FROM detail_vente WHERE id_vente = ?',
      [idVente]
    );

    res.status(201).json({
      ...venteFinale[0],
      details: detailsFinaux,
      promos: lignesCalculees
        .filter((l) => l.promoAppliquee)
        .map((l) => ({
          idVariante: l.idVariante,
          promo: l.promoAppliquee,
          remise: l.remise,
        })),
    });
  } catch (erreur) {
    await connexionDb.rollback();
    console.error(erreur);

    if (
      erreur.message.includes('Stock insuffisant') ||
      erreur.message.includes('introuvable')
    ) {
      return res.status(409).json({ message: erreur.message });
    }

    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message });
  } finally {
    connexionDb.release();
  }
}

async function annulerVente(req, res) {
  const connexionDb = await pool.getConnection();

  try {
    const { id } = req.params;

    await connexionDb.beginTransaction();

    const [vente] = await connexionDb.query(
      'SELECT statut FROM vente WHERE id_vente = ? FOR UPDATE',
      [id]
    );

    if (vente.length === 0) {
      throw new Error('Vente introuvable');
    }

    if (vente[0].statut === 'annulee') {
      throw new Error('Cette vente est déjà annulée');
    }

    const [details] = await connexionDb.query(
      'SELECT id_variante, quantite FROM detail_vente WHERE id_vente = ?',
      [id]
    );

    for (const detail of details) {
      await connexionDb.query(
        'UPDATE variante SET stock = stock + ? WHERE id_variante = ?',
        [detail.quantite, detail.id_variante]
      );

      await connexionDb.query(
        `INSERT INTO mouvement_stock
         (variante, typeMouvement, quantite, motif, documentType, documentId)
         VALUES (?, 'entree', ?, 'retour', 'vente', ?)`,
        [detail.id_variante, detail.quantite, id]
      );
    }

    await connexionDb.query(
      "UPDATE vente SET statut = 'annulee' WHERE id_vente = ?",
      [id]
    );

    await connexionDb.commit();

    res.json({ message: 'Vente annulée, stock réintégré' });
  } catch (erreur) {
    await connexionDb.rollback();
    console.error(erreur);

    if (
      erreur.message.includes('introuvable') ||
      erreur.message.includes('déjà annulée')
    ) {
      return res.status(409).json({ message: erreur.message });
    }

    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message });
  } finally {
    connexionDb.release();
  }
}

module.exports = { listerVentes, obtenirVente, creerVente, annulerVente };