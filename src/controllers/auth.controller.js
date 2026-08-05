const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

/**
 * Blocage par COMPTE (email), pas par IP.
 * Après MAX_ECHECS mauvais mots de passe sur le même email,
 * ce compte seul est bloqué pendant FENETRE_MS.
 * Les autres comptes restent utilisables.
 */
const MAX_ECHECS = Number(process.env.LOGIN_MAX_ECHECS || 5);
const FENETRE_MS = Number(process.env.LOGIN_BLOCAGE_MS || 15 * 60 * 1000);

/** Map email → { echecs: number, bloqueJusquA: number|null } */
const tentativesParEmail = new Map();

function getEtatCompte(email) {
  const etat = tentativesParEmail.get(email);
  if (!etat) return { echecs: 0, bloqueJusquA: null };

  // Fenêtre de blocage expirée → reset
  if (etat.bloqueJusquA && Date.now() >= etat.bloqueJusquA) {
    tentativesParEmail.delete(email);
    return { echecs: 0, bloqueJusquA: null };
  }
  return etat;
}

function enregistrerEchec(email) {
  const etat = getEtatCompte(email);
  const echecs = (etat.echecs || 0) + 1;
  const bloqueJusquA =
    echecs >= MAX_ECHECS ? Date.now() + FENETRE_MS : etat.bloqueJusquA || null;

  tentativesParEmail.set(email, { echecs, bloqueJusquA });
  return { echecs, bloqueJusquA };
}

function resetEchecs(email) {
  tentativesParEmail.delete(email);
}

function minutesRestantes(bloqueJusquA) {
  if (!bloqueJusquA) return 0;
  return Math.max(1, Math.ceil((bloqueJusquA - Date.now()) / 60000));
}

/**
 * Inscription publique : uniquement le rôle "vendeur".
 */
async function inscription(req, res) {
  try {
    const { nom, prenom, email, telephone, motDePasse } = req.body || {};

    if (!nom || !prenom || !email || !motDePasse) {
      return res.status(400).json({
        message: 'Champs obligatoires manquants (nom, prenom, email, motDePasse)',
      });
    }

    if (String(motDePasse).length < 8) {
      return res.status(400).json({
        message: 'Le mot de passe doit contenir au moins 8 caractères',
      });
    }

    const emailNorm = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return res.status(400).json({ message: 'Adresse e-mail invalide' });
    }

    const [dejaExiste] = await pool.query(
      'SELECT id_utilisateur FROM utilisateur WHERE email = ?',
      [emailNorm]
    );

    if (dejaExiste.length > 0) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé' });
    }

    const [roles] = await pool.query(
      `SELECT id_role FROM role WHERE LOWER(libelle) IN ('vendeur', 'seller') LIMIT 1`
    );

    if (roles.length === 0) {
      return res.status(500).json({
        message: 'Rôle « vendeur » introuvable en base. Contactez l\'administrateur.',
      });
    }

    const idRoleVendeur = roles[0].id_role;
    const motDePasseHash = await bcrypt.hash(motDePasse, 12);

    const [resultat] = await pool.query(
      `INSERT INTO utilisateur (nom, prenom, email, telephone, mot_de_passe, id_role, statut)
       VALUES (?, ?, ?, ?, ?, ?, 'actif')`,
      [
        String(nom).trim(),
        String(prenom).trim(),
        emailNorm,
        telephone ? String(telephone).trim() : null,
        motDePasseHash,
        idRoleVendeur,
      ]
    );

    const [nouvelUtilisateur] = await pool.query(
      `SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.id_role, r.libelle AS role
       FROM utilisateur u
       LEFT JOIN role r ON u.id_role = r.id_role
       WHERE u.id_utilisateur = ?`,
      [resultat.insertId]
    );

    res.status(201).json({
      message: 'Compte créé avec succès. Vous pouvez vous connecter.',
      utilisateur: nouvelUtilisateur[0],
    });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

async function connexion(req, res) {
  try {
    const { email, motDePasse } = req.body || {};

    if (!email || !motDePasse) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    const emailNorm = String(email).trim().toLowerCase();

    // --- Blocage par compte (email) ---
    const etat = getEtatCompte(emailNorm);
    if (etat.bloqueJusquA && Date.now() < etat.bloqueJusquA) {
      const min = minutesRestantes(etat.bloqueJusquA);
      return res.status(429).json({
        message: `Trop de tentatives pour ce compte. Réessayez dans ${min} minute(s).`,
        compteBloque: true,
        minutesRestantes: min,
      });
    }

    const [resultat] = await pool.query(
      `SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.mot_de_passe,
              u.id_role, u.statut, r.libelle AS role_libelle
       FROM utilisateur u
       JOIN role r ON u.id_role = r.id_role
       WHERE u.email = ?`,
      [emailNorm]
    );

    // Email inconnu : même message que mauvais mdp (ne pas révéler si l'email existe)
    // On compte aussi comme échec pour limiter le sondage d'emails
    if (resultat.length === 0) {
      const { echecs, bloqueJusquA } = enregistrerEchec(emailNorm);
      if (bloqueJusquA) {
        const min = minutesRestantes(bloqueJusquA);
        return res.status(429).json({
          message: `Trop de tentatives pour ce compte. Réessayez dans ${min} minute(s).`,
          compteBloque: true,
          minutesRestantes: min,
        });
      }
      return res.status(401).json({
        message: 'Email ou mot de passe incorrect',
        tentativesRestantes: Math.max(0, MAX_ECHECS - echecs),
      });
    }

    const utilisateur = resultat[0];

    if (utilisateur.statut !== 'actif') {
      return res.status(403).json({
        message: 'Compte désactivé. Contactez un administrateur.',
      });
    }

    const motDePasseValide = await bcrypt.compare(
      motDePasse,
      utilisateur.mot_de_passe
    );

    if (!motDePasseValide) {
      const { echecs, bloqueJusquA } = enregistrerEchec(emailNorm);
      if (bloqueJusquA) {
        const min = minutesRestantes(bloqueJusquA);
        return res.status(429).json({
          message: `Trop de tentatives pour ce compte. Réessayez dans ${min} minute(s).`,
          compteBloque: true,
          minutesRestantes: min,
        });
      }
      return res.status(401).json({
        message: 'Email ou mot de passe incorrect',
        tentativesRestantes: Math.max(0, MAX_ECHECS - echecs),
      });
    }

    // Succès → on efface les échecs de CE compte
    resetEchecs(emailNorm);

    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 16) {
      console.error('JWT_SECRET manquant ou trop court');
      return res.status(500).json({ message: 'Erreur de configuration serveur' });
    }

    const token = jwt.sign(
      {
        id: utilisateur.id_utilisateur,
        email: utilisateur.email,
        role: utilisateur.role_libelle,
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      message: 'Connexion réussie',
      token,
      utilisateur: {
        id: utilisateur.id_utilisateur,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        email: utilisateur.email,
        role: utilisateur.role_libelle,
      },
    });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}


/**
 * Inscription ADMIN protégée par token secret (.env ADMIN_SETUP_TOKEN).
 * - Token obligatoire et identique à celui du serveur
 * - Si un admin existe déjà et ALLOW_ADMIN_SETUP n'est pas "true", refus
 * - create-admin en terminal reste le plan B
 */
async function inscriptionAdmin(req, res) {
  try {
    const setupTokenEnv = process.env.ADMIN_SETUP_TOKEN || '';
    if (!setupTokenEnv || setupTokenEnv.length < 16) {
      return res.status(403).json({
        message: 'Inscription admin désactivée (ADMIN_SETUP_TOKEN non configuré).',
      });
    }

    const { nom, prenom, email, telephone, motDePasse, setupToken } = req.body || {};

    if (!setupToken || setupToken !== setupTokenEnv) {
      return res.status(403).json({ message: 'Lien ou code d\'installation invalide.' });
    }

    if (!nom || !prenom || !email || !motDePasse) {
      return res.status(400).json({
        message: 'Champs obligatoires manquants (nom, prenom, email, motDePasse)',
      });
    }

    if (String(motDePasse).length < 8) {
      return res.status(400).json({
        message: 'Le mot de passe doit contenir au moins 8 caractères',
      });
    }

    const emailNorm = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return res.status(400).json({ message: 'Adresse e-mail invalide' });
    }

    // Compter les admins existants
    const [admins] = await pool.query(
      `SELECT COUNT(*) AS n
       FROM utilisateur u
       JOIN role r ON u.id_role = r.id_role
       WHERE LOWER(r.libelle) IN ('administrateur', 'admin')`
    );
    const nbAdmins = Number(admins[0]?.n || 0);
    const allowAlways = String(process.env.ALLOW_ADMIN_SETUP || '').toLowerCase() === 'true';

    if (nbAdmins > 0 && !allowAlways) {
      return res.status(403).json({
        message:
          'Un administrateur existe déjà. Inscription admin fermée. Utilisez le menu Utilisateurs ou create-admin.',
      });
    }

    const [roles] = await pool.query(
      `SELECT id_role FROM role WHERE LOWER(libelle) IN ('administrateur', 'admin') LIMIT 1`
    );
    if (roles.length === 0) {
      return res.status(500).json({ message: 'Rôle administrateur introuvable en base.' });
    }
    const idRoleAdmin = roles[0].id_role;

    const [dejaExiste] = await pool.query(
      'SELECT id_utilisateur FROM utilisateur WHERE email = ?',
      [emailNorm]
    );
    if (dejaExiste.length > 0) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé' });
    }

    const motDePasseHash = await bcrypt.hash(motDePasse, 12);
    const [resultat] = await pool.query(
      `INSERT INTO utilisateur (nom, prenom, email, telephone, mot_de_passe, id_role, statut)
       VALUES (?, ?, ?, ?, ?, ?, 'actif')`,
      [
        String(nom).trim(),
        String(prenom).trim(),
        emailNorm,
        telephone ? String(telephone).trim() : null,
        motDePasseHash,
        idRoleAdmin,
      ]
    );

    const [nouvelUtilisateur] = await pool.query(
      `SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.id_role, r.libelle AS role
       FROM utilisateur u
       LEFT JOIN role r ON u.id_role = r.id_role
       WHERE u.id_utilisateur = ?`,
      [resultat.insertId]
    );

    res.status(201).json({
      message: 'Compte administrateur créé. Vous pouvez vous connecter.',
      utilisateur: nouvelUtilisateur[0],
    });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}


module.exports = { inscription, connexion, inscriptionAdmin };