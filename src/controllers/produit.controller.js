const pool = require('../config/database');

async function listerProduits(req, res) {
  try {
    const [resultat] = await pool.query(`
      SELECT p.*, c.nom AS categorie_nom, m.nom AS marque_nom,
             COALESCE(SUM(v.stock), 0) AS stock_total
      FROM produit p
      LEFT JOIN categorie c ON p.id_categorie = c.id_categorie
      LEFT JOIN marque m ON p.id_marque = m.id_marque
      LEFT JOIN variante v ON v.id_produit = p.id_produit
      GROUP BY p.id_produit, c.nom, m.nom
      ORDER BY p.id_produit DESC
    `);
    res.json(resultat);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message });
  }
}

async function obtenirProduit(req, res) {
  try {
    const { id } = req.params;

    const [produit] = await pool.query(
      'SELECT * FROM produit WHERE id_produit = ?',
      [id]
    );

    if (produit.length === 0) {
      return res.status(404).json({ message: 'Produit introuvable' });
    }

    const [variantes] = await pool.query(
      'SELECT * FROM variante WHERE id_produit = ?',
      [id]
    );

    res.json({ ...produit[0], variantes });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message });
  }
}

async function creerProduit(req, res) {
  const connexionDb = await pool.getConnection();

  try {
    const {
      reference, nom, description, idMarque, idCategorie,
      matiere, genre, saison, prixAchat, prixVente,
      seuilAlerte, photo, idFournisseur, variantes
    } = req.body;

    if (!reference || !nom || !prixVente) {
      connexionDb.release();
      return res.status(400).json({ message: 'Référence, nom et prix de vente obligatoires' });
    }

    await connexionDb.beginTransaction();

    const [produitResultat] = await connexionDb.query(
      `INSERT INTO produit 
       (reference, nom, description, id_marque, id_categorie, matiere, genre, 
        saison, prix_achat, prix_vente, seuil_alerte, photo, id_fournisseur)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [reference, nom, description, idMarque, idCategorie, matiere, genre,
       saison, prixAchat, prixVente, seuilAlerte || 5, photo, idFournisseur]
    );

    const idProduitCree = produitResultat.insertId;
    const variantesCreees = [];

    if (variantes && variantes.length > 0) {
      for (const v of variantes) {
        const [varianteResultat] = await connexionDb.query(
          `INSERT INTO variante 
           (id_produit, taille, couleur, stock, prix_achat, prix_vente, seuil_alerte)
           VALUES (?,?,?,?,?,?,?)`,
          [idProduitCree, v.taille, v.couleur, v.stock || 0,
           v.prixAchat || prixAchat, v.prixVente || prixVente, v.seuilAlerte || seuilAlerte || 5]
        );
        variantesCreees.push({ id_variante: varianteResultat.insertId, ...v });
      }
    }

    await connexionDb.commit();

    const [produitFinal] = await pool.query(
      'SELECT * FROM produit WHERE id_produit = ?',
      [idProduitCree]
    );

    res.status(201).json({ ...produitFinal[0], variantes: variantesCreees });
  } catch (erreur) {
    await connexionDb.rollback();
    console.error(erreur);
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message });
  } finally {
    connexionDb.release();
  }
}

async function modifierProduit(req, res) {
  try {
    const { id } = req.params;
    const { nom, description, prixAchat, prixVente, seuilAlerte, photo } = req.body;

    await pool.query(
      `UPDATE produit 
       SET nom = COALESCE(?, nom), description = COALESCE(?, description),
           prix_achat = COALESCE(?, prix_achat), prix_vente = COALESCE(?, prix_vente),
           seuil_alerte = COALESCE(?, seuil_alerte), photo = COALESCE(?, photo)
       WHERE id_produit = ?`,
      [nom, description, prixAchat, prixVente, seuilAlerte, photo, id]
    );

    const [produitMisAJour] = await pool.query(
      'SELECT * FROM produit WHERE id_produit = ?',
      [id]
    );

    if (produitMisAJour.length === 0) {
      return res.status(404).json({ message: 'Produit introuvable' });
    }

    res.json(produitMisAJour[0]);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message });
  }
}

async function supprimerProduit(req, res) {
  try {
    const { id } = req.params;
    const [resultat] = await pool.query(
      'DELETE FROM produit WHERE id_produit = ?',
      [id]
    );

    if (resultat.affectedRows === 0) {
      return res.status(404).json({ message: 'Produit introuvable' });
    }

    res.json({ message: 'Produit supprimé' });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message });
  }
}

async function produitsStockFaible(req, res) {
  try {
    const [resultat] = await pool.query(`
      SELECT p.id_produit, p.nom, p.reference, v.id_variante, v.taille, 
             v.couleur, v.stock, v.seuil_alerte
      FROM variante v
      JOIN produit p ON v.id_produit = p.id_produit
      WHERE v.stock <= v.seuil_alerte
      ORDER BY v.stock ASC
    `);
    res.json(resultat);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message });
  }
}
async function creerVariante(req, res) {
  try {
    const idProduit = req.params.id;
    const { taille, couleur, stock, prixAchat, prixVente, seuilAlerte } = req.body || {};

    const [prod] = await pool.query(
      'SELECT id_produit, prix_achat, prix_vente, seuil_alerte FROM produit WHERE id_produit = ?',
      [idProduit]
    );
    if (prod.length === 0) {
      return res.status(404).json({ message: 'Produit introuvable' });
    }

    if (!taille && !couleur) {
      return res.status(400).json({ message: 'taille ou couleur obligatoire' });
    }

    const [r] = await pool.query(
      `INSERT INTO variante
       (id_produit, taille, couleur, stock, prix_achat, prix_vente, seuil_alerte)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        idProduit,
        taille || null,
        couleur || null,
        stock != null ? Number(stock) : 0,
        prixAchat != null ? prixAchat : prod[0].prix_achat,
        prixVente != null ? prixVente : prod[0].prix_vente,
        seuilAlerte != null ? seuilAlerte : prod[0].seuil_alerte || 5,
      ]
    );

    const [row] = await pool.query(
      'SELECT * FROM variante WHERE id_variante = ?',
      [r.insertId]
    );
    res.status(201).json(row[0]);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message });
  }
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