const pool = require('../config/database');

async function listerClients(req, res) {
  try {
    const [resultat] = await pool.query(`
      SELECT * FROM client
      ORDER BY id_client DESC
    `);
    res.json(resultat);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message });
  }
}

async function obtenirClient(req, res) {
  try {
    const { id } = req.params;

    const [client] = await pool.query(
      'SELECT * FROM client WHERE id_client = ?',
      [id]
    );

    if (client.length === 0) {
      return res.status(404).json({ message: 'Client introuvable' });
    }

    // Historique des ventes du client (optionnel mais utile)
    const [ventes] = await pool.query(
      `SELECT id_vente, date_vente, montant_total, mode_paiement_principal, statut
       FROM vente
       WHERE id_client = ?
       ORDER BY date_vente DESC`,
      [id]
    );

    res.json({ ...client[0], ventes });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message });
  }
}

async function creerClient(req, res) {
  try {
    const { nom, prenom, telephone, email } = req.body;

    if (!nom || !prenom) {
      return res.status(400).json({ message: 'Nom et prénom obligatoires' });
    }

    // Vérifier email unique s'il est fourni
    if (email) {
      const [existe] = await pool.query(
        'SELECT id_client FROM client WHERE email = ?',
        [email]
      );
      if (existe.length > 0) {
        return res.status(409).json({ message: 'Cet email est déjà utilisé' });
      }
    }

    const [resultat] = await pool.query(
      `INSERT INTO client (nom, prenom, telephone, email, date_creation)
       VALUES (?, ?, ?, ?, NOW())`,
      [nom, prenom, telephone || null, email || null]
    );

    const [nouveauClient] = await pool.query(
      'SELECT * FROM client WHERE id_client = ?',
      [resultat.insertId]
    );

    res.status(201).json(nouveauClient[0]);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message });
  }
}

async function modifierClient(req, res) {
  try {
    const { id } = req.params;
    const { nom, prenom, telephone, email } = req.body;

    // Vérifier que le client existe
    const [existant] = await pool.query(
      'SELECT id_client FROM client WHERE id_client = ?',
      [id]
    );
    if (existant.length === 0) {
      return res.status(404).json({ message: 'Client introuvable' });
    }

    // Vérifier email unique (sauf pour ce client)
    if (email) {
      const [doublon] = await pool.query(
        'SELECT id_client FROM client WHERE email = ? AND id_client != ?',
        [email, id]
      );
      if (doublon.length > 0) {
        return res.status(409).json({ message: 'Cet email est déjà utilisé' });
      }
    }

    await pool.query(
      `UPDATE client
       SET nom = COALESCE(?, nom),
           prenom = COALESCE(?, prenom),
           telephone = COALESCE(?, telephone),
           email = COALESCE(?, email)
       WHERE id_client = ?`,
      [nom, prenom, telephone, email, id]
    );

    const [clientMisAJour] = await pool.query(
      'SELECT * FROM client WHERE id_client = ?',
      [id]
    );

    res.json(clientMisAJour[0]);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message });
  }
}

async function supprimerClient(req, res) {
  try {
    const { id } = req.params;

    // Vérifier s'il a des ventes liées
    const [ventes] = await pool.query(
      'SELECT id_vente FROM vente WHERE id_client = ? LIMIT 1',
      [id]
    );
    if (ventes.length > 0) {
      return res.status(409).json({
        message: 'Impossible de supprimer : ce client a des ventes associées'
      });
    }

    const [resultat] = await pool.query(
      'DELETE FROM client WHERE id_client = ?',
      [id]
    );

    if (resultat.affectedRows === 0) {
      return res.status(404).json({ message: 'Client introuvable' });
    }

    res.json({ message: 'Client supprimé' });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ message: 'Erreur serveur', erreur: erreur.message });
  }
}

module.exports = {
  listerClients,
  obtenirClient,
  creerClient,
  modifierClient,
  supprimerClient
};