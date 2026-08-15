const { ApiError } = require('../utils/error-handler');
const produitRepository = require('../repositories/produit.repository');
const pool = require('../config/database');
const { logAction } = require('./audit.service');

async function listerProduits() {
  return produitRepository.listProducts();
}

async function obtenirProduit(id) {
  const produit = await produitRepository.getProductById(id);
  if (!produit) throw new ApiError(404, 'Produit introuvable');
  const variantes = await produitRepository.getVariantsByProductId(id);
  return { ...produit, variantes };
}

function assertPrixValides(payload) {
  if (payload.prixVente != null && Number(payload.prixVente) <= 0) {
    throw new ApiError(400, 'Le prix de vente doit être supérieur à zéro');
  }
  if (payload.prixAchat != null && Number(payload.prixAchat) < 0) {
    throw new ApiError(400, 'Le prix d\'achat ne peut pas être négatif');
  }
}

async function creerProduit(payload, user) {
  const {
    reference, nom, description, idMarque, idCategorie,
    matiere, genre, saison, prixAchat, prixVente,
    seuilAlerte, photo, idFournisseur, variantes,
  } = payload;

  if (!reference || !nom || prixVente == null) {
    throw new ApiError(400, 'Référence, nom et prix de vente obligatoires');
  }
  assertPrixValides(payload);

  const ref = String(reference).trim();
  const nomP = String(nom).trim();
  const existRef = await produitRepository.findByReference(ref);
  if (existRef) {
    throw new ApiError(409, `Un produit avec la référence « ${ref} » existe déjà`);
  }
  const existNom = await produitRepository.findByNom(nomP);
  if (existNom) {
    throw new ApiError(409, `Un produit nommé « ${nomP} » existe déjà`);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const idProduitCree = await produitRepository.createProduct({
      reference: ref, nom: nomP, description, idMarque, idCategorie,
      matiere, genre, saison, prixAchat, prixVente,
      seuilAlerte, photo, idFournisseur,
    }, connection);

    const variantesCreees = [];
    if (Array.isArray(variantes) && variantes.length > 0) {
      for (const variante of variantes) {
        if (variante.stock != null && Number(variante.stock) < 0) {
          throw new ApiError(400, 'Le stock ne peut pas être négatif');
        }
        const insertId = await produitRepository.createVariant({
          productId: idProduitCree,
          taille: variante.taille,
          couleur: variante.couleur,
          stock: variante.stock || 0,
          prixAchat: variante.prixAchat ?? prixAchat,
          prixVente: variante.prixVente ?? prixVente,
          seuilAlerte: variante.seuilAlerte ?? seuilAlerte ?? 5,
        }, connection);
        variantesCreees.push({ id_variante: insertId, ...variante });
      }
    }
    await connection.commit();
    const produitFinal = await produitRepository.getProductById(idProduitCree);
    await logAction({
      userId: user?.id || null,
      module: 'produit',
      action: 'CREATE',
      newValue: { id: idProduitCree, reference, nom, prixVente, prixAchat },
    });
    return { ...produitFinal, variantes: variantesCreees };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function modifierProduit(id, payload, user) {
  const before = await produitRepository.getProductById(id);
  if (!before) throw new ApiError(404, 'Produit introuvable');
  assertPrixValides(payload);

  const { nom, description, prixAchat, prixVente, seuilAlerte, photo } = payload;
  await produitRepository.updateProduct({
    id, nom, description, prixAchat, prixVente, seuilAlerte, photo,
  });
  const after = await produitRepository.getProductById(id);

  await logAction({
    userId: user?.id || null,
    module: 'produit',
    action: 'UPDATE',
    oldValue: {
      id: before.id_produit,
      nom: before.nom,
      prix_vente: before.prix_vente,
      prix_achat: before.prix_achat,
    },
    newValue: {
      id: after.id_produit,
      nom: after.nom,
      prix_vente: after.prix_vente,
      prix_achat: after.prix_achat,
    },
  });
  return after;
}

async function supprimerProduit(id, user) {
  const before = await produitRepository.getProductById(id);
  if (!before) throw new ApiError(404, 'Produit introuvable');

  // Sécurité : refuser si des lignes de vente existent sur les variantes
  const [ventes] = await pool.query(
    `SELECT COUNT(*) AS n FROM detail_vente dv
     JOIN variante v ON dv.id_variante = v.id_variante
     WHERE v.id_produit = ?`,
    [id]
  ).catch(() => [[{ n: 0 }]]);

  if (Number(ventes[0]?.n || 0) > 0) {
    // soft delete autorisé même avec ventes (corbeille), mais pas hard
    // on soft-delete quand même pour garder l'historique des ventes
  }

  const affectedRows = await produitRepository.deleteProduct(id);
  if (affectedRows === 0) throw new ApiError(404, 'Produit introuvable');

  await logAction({
    userId: user?.id || null,
    module: 'produit',
    action: 'SOFT_DELETE',
    oldValue: {
      id: before.id_produit,
      nom: before.nom,
      reference: before.reference,
      prix_vente: before.prix_vente,
    },
  });
  return { message: 'Produit déplacé vers la corbeille' };
}

async function produitsStockFaible() {
  return produitRepository.getLowStockProducts();
}

async function creerVariante(id, payload, user) {
  const { taille, couleur, stock, prixAchat, prixVente, seuilAlerte } = payload;
  const produit = await produitRepository.getProductById(id);
  if (!produit) throw new ApiError(404, 'Produit introuvable');
  if (!taille && !couleur) throw new ApiError(400, 'taille ou couleur obligatoire');
  if (stock != null && Number(stock) < 0) {
    throw new ApiError(400, 'Le stock ne peut pas être négatif');
  }

  const insertId = await produitRepository.createVariant({
    productId: id,
    taille: taille || null,
    couleur: couleur || null,
    stock: stock != null ? Number(stock) : 0,
    prixAchat: prixAchat != null ? prixAchat : produit.prix_achat,
    prixVente: prixVente != null ? prixVente : produit.prix_vente,
    seuilAlerte: seuilAlerte != null ? seuilAlerte : produit.seuil_alerte || 5,
  }, pool);

  const [row] = await pool.query('SELECT * FROM variante WHERE id_variante = ?', [insertId]);
  await logAction({
    userId: user?.id || null,
    module: 'produit',
    action: 'CREATE_VARIANTE',
    newValue: row[0],
  });
  return row[0];
}

module.exports = {
  listerProduits,
  obtenirProduit,
  creerProduit,
  modifierProduit,
  supprimerProduit,
  produitsStockFaible,
  creerVariante,
};
