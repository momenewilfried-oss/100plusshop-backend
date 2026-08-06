const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { ApiError } = require('../utils/error-handler');
const authRepository = require('../repositories/auth.repository');
const { logAction } = require('./audit.service');

const MAX_ECHECS = Number(process.env.LOGIN_MAX_ECHECS || 5);
const FENETRE_MS = Number(process.env.LOGIN_BLOCAGE_MS || 15 * 60 * 1000);
const tentativesParEmail = new Map();

function getEtatCompte(email) {
  const etat = tentativesParEmail.get(email);
  if (!etat) return { echecs: 0, bloqueJusquA: null };

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

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function prepareUserForResponse(user) {
  return {
    id: user.id_utilisateur,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    role: user.role_libelle || user.role,
  };
}

async function inscription({ nom, prenom, email, telephone, motDePasse }) {
  if (!nom || !prenom || !email || !motDePasse) {
    throw new ApiError(400, 'Champs obligatoires manquants (nom, prenom, email, motDePasse)');
  }

  if (String(motDePasse).length < 8) {
    throw new ApiError(400, 'Le mot de passe doit contenir au moins 8 caractères');
  }

  const emailNorm = normalizeEmail(email);
  if (!validateEmail(emailNorm)) {
    throw new ApiError(400, 'Adresse e-mail invalide');
  }

  const exists = await authRepository.findUserByEmailExists(emailNorm);
  if (exists) {
    throw new ApiError(409, 'Cet email est déjà utilisé');
  }

  const roles = await authRepository.findRoleByLabels(['vendeur', 'seller']);
  if (roles.length === 0) {
    throw new ApiError(500, 'Rôle « vendeur » introuvable en base. Contactez l\'administrateur.');
  }

  const idRoleVendeur = roles[0].id_role;
  const motDePasseHash = await bcrypt.hash(motDePasse, 12);

  const insertId = await authRepository.insertUser({
    nom: String(nom).trim(),
    prenom: String(prenom).trim(),
    email: emailNorm,
    telephone: telephone ? String(telephone).trim() : null,
    motDePasseHash,
    idRole: idRoleVendeur,
  });

  const nouvelUtilisateur = await authRepository.getUserByIdWithRole(insertId);
  return {
    message: 'Compte créé avec succès. Vous pouvez vous connecter.',
    utilisateur: nouvelUtilisateur,
  };
}

async function connexion({ email, motDePasse }) {
  if (!email || !motDePasse) {
    throw new ApiError(400, 'Email et mot de passe requis');
  }

  const emailNorm = normalizeEmail(email);
  const etat = getEtatCompte(emailNorm);
  if (etat.bloqueJusquA && Date.now() < etat.bloqueJusquA) {
    const min = minutesRestantes(etat.bloqueJusquA);
    const err = new ApiError(429, `Trop de tentatives pour ce compte. Réessayez dans ${min} minute(s).`);
    err.details = { compteBloque: true, minutesRestantes: min };
    throw err;
  }

  const users = await authRepository.findUserByEmail(emailNorm);
  if (users.length === 0) {
    const { echecs, bloqueJusquA } = enregistrerEchec(emailNorm);
      await logAction({
        userId: null,
        module: 'auth',
        action: 'LOGIN_FAILURE',
        newValue: { email: emailNorm, echecs },
      });
    if (bloqueJusquA) {
      const min = minutesRestantes(bloqueJusquA);
      const err = new ApiError(429, `Trop de tentatives pour ce compte. Réessayez dans ${min} minute(s).`);
      err.details = { compteBloque: true, minutesRestantes: min };
      throw err;
    }
    throw new ApiError(401, 'Email ou mot de passe incorrect', { tentativesRestantes: Math.max(0, MAX_ECHECS - echecs) });
  }

  const utilisateur = users[0];
  if (utilisateur.statut !== 'actif') {
    throw new ApiError(403, 'Compte désactivé. Contactez un administrateur.');
  }

  const motDePasseValide = await bcrypt.compare(motDePasse, utilisateur.mot_de_passe);
  if (!motDePasseValide) {
    const { echecs, bloqueJusquA } = enregistrerEchec(emailNorm);
      await logAction({
        userId: null,
        module: 'auth',
        action: 'LOGIN_FAILURE',
        newValue: { email: emailNorm, echecs },
      });
    if (bloqueJusquA) {
      const min = minutesRestantes(bloqueJusquA);
      const err = new ApiError(429, `Trop de tentatives pour ce compte. Réessayez dans ${min} minute(s).`);
      err.details = { compteBloque: true, minutesRestantes: min };
      throw err;
    }
    throw new ApiError(401, 'Email ou mot de passe incorrect', { tentativesRestantes: Math.max(0, MAX_ECHECS - echecs) });
  }

  resetEchecs(emailNorm);
    await logAction({
      userId: utilisateur.id_utilisateur,
      module: 'auth',
      action: 'LOGIN_SUCCESS',
      newValue: { email: emailNorm },
    });

  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new ApiError(500, 'Erreur de configuration serveur');
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

  return {
    message: 'Connexion réussie',
    token,
    utilisateur: await prepareUserForResponse(utilisateur),
  };
}

async function inscriptionAdmin({ nom, prenom, email, telephone, motDePasse, setupToken }) {
  const setupTokenEnv = process.env.ADMIN_SETUP_TOKEN || '';
  if (!setupTokenEnv || setupTokenEnv.length < 16) {
    throw new ApiError(403, 'Inscription admin désactivée (ADMIN_SETUP_TOKEN non configuré).');
  }
  if (!setupToken || setupToken !== setupTokenEnv) {
    throw new ApiError(403, 'Lien ou code d\'installation invalide.');
  }
  if (!nom || !prenom || !email || !motDePasse) {
    throw new ApiError(400, 'Champs obligatoires manquants (nom, prenom, email, motDePasse)');
  }

  if (String(motDePasse).length < 8) {
    throw new ApiError(400, 'Le mot de passe doit contenir au moins 8 caractères');
  }

  const emailNorm = normalizeEmail(email);
  if (!validateEmail(emailNorm)) {
    throw new ApiError(400, 'Adresse e-mail invalide');
  }

  const nbAdmins = await authRepository.countAdmins();
  const allowAlways = String(process.env.ALLOW_ADMIN_SETUP || '').toLowerCase() === 'true';
  if (nbAdmins > 0 && !allowAlways) {
    throw new ApiError(403, 'Un administrateur existe déjà. Inscription admin fermée. Utilisez le menu Utilisateurs ou create-admin.');
  }

  const roles = await authRepository.findRoleByLabels(['administrateur', 'admin']);
  if (roles.length === 0) {
    throw new ApiError(500, 'Rôle administrateur introuvable en base.');
  }
  const idRoleAdmin = roles[0].id_role;

  const exists = await authRepository.findUserByEmailExists(emailNorm);
  if (exists) {
    throw new ApiError(409, 'Cet email est déjà utilisé');
  }

  const motDePasseHash = await bcrypt.hash(motDePasse, 12);
  const insertId = await authRepository.insertUser({
    nom: String(nom).trim(),
    prenom: String(prenom).trim(),
    email: emailNorm,
    telephone: telephone ? String(telephone).trim() : null,
    motDePasseHash,
    idRole: idRoleAdmin,
  });

  const nouvelUtilisateur = await authRepository.getUserByIdWithRole(insertId);
  return {
    message: 'Compte administrateur créé. Vous pouvez vous connecter.',
    utilisateur: nouvelUtilisateur,
  };
}

module.exports = { inscription, connexion, inscriptionAdmin };