const bcrypt = require('bcrypt');
const { ApiError } = require('../utils/error-handler');
const utilisateurRepository = require('../repositories/utilisateur.repository');
const { logAction } = require('./audit.service');

async function listerUtilisateurs() {
  return utilisateurRepository.listUsers();
}

async function obtenirUtilisateur(id) {
  const utilisateur = await utilisateurRepository.getUserById(id);
  if (!utilisateur) throw new ApiError(404, 'Utilisateur introuvable');
  return utilisateur;
}

async function creerUtilisateur(body, actor) {
  const { nom, prenom, email, telephone, motDePasse, idRole } = body || {};
  if (!nom || !prenom || !email || !motDePasse || !idRole) {
    throw new ApiError(400, 'nom, prenom, email, motDePasse et idRole obligatoires');
  }
  if (String(motDePasse).length < 8) {
    throw new ApiError(400, 'Le mot de passe doit contenir au moins 8 caractères');
  }

  const emailNorm = String(email).trim().toLowerCase();
  const existe = await utilisateurRepository.existsEmail(emailNorm);
  if (existe) throw new ApiError(409, 'Cet email est déjà utilisé');

  const hash = await bcrypt.hash(motDePasse, 12);
  const insertId = await utilisateurRepository.createUser({
    nom: String(nom).trim(),
    prenom: String(prenom).trim(),
    email: emailNorm,
    telephone: telephone || null,
    motDePasseHash: hash,
    idRole,
  });

  const created = await utilisateurRepository.getUserById(insertId);
  await logAction({
    userId: actor?.id || null,
    module: 'utilisateur',
    action: 'CREATE',
    newValue: { id: insertId, email: emailNorm, idRole },
  });
  return created;
}

async function modifierUtilisateur(id, body, actor) {
  const before = await utilisateurRepository.getUserById(id);
  if (!before) throw new ApiError(404, 'Utilisateur introuvable');

  const { nom, prenom, telephone, idRole, statut, motDePasse } = body || {};
  await utilisateurRepository.updateUser({ id, nom, prenom, telephone, idRole, statut });

  if (motDePasse) {
    if (String(motDePasse).length < 8) {
      throw new ApiError(400, 'Le mot de passe doit contenir au moins 8 caractères');
    }
    const hash = await bcrypt.hash(motDePasse, 12);
    await utilisateurRepository.updateUserPassword(id, hash);
  }

  const after = await utilisateurRepository.getUserById(id);
  await logAction({
    userId: actor?.id || null,
    module: 'utilisateur',
    action: 'UPDATE',
    oldValue: before,
    newValue: after,
  });
  return after;
}

async function supprimerUtilisateur(id, currentUserId, actor) {
  if (Number(id) === Number(currentUserId)) {
    throw new ApiError(400, 'Vous ne pouvez pas supprimer votre propre compte');
  }
  const before = await utilisateurRepository.getUserById(id);
  const affectedRows = await utilisateurRepository.deleteUser(id);
  if (affectedRows === 0) throw new ApiError(404, 'Utilisateur introuvable');

  await logAction({
    userId: actor?.id || currentUserId || null,
    module: 'utilisateur',
    action: 'SOFT_DELETE',
    oldValue: before,
  });
  return { message: 'Utilisateur désactivé (soft delete)' };
}

async function listerRoles() {
  return utilisateurRepository.listRoles();
}

module.exports = {
  listerUtilisateurs,
  obtenirUtilisateur,
  creerUtilisateur,
  modifierUtilisateur,
  supprimerUtilisateur,
  listerRoles,
};