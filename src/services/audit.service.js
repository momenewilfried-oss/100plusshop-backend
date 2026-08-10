const pool = require('../config/database');
const logger = require('../helpers/logger');

/** Libellés lisibles pour le journal */
const ACTION_LABELS = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
  ANNULER: 'Annulation',
  LOGIN: 'Connexion',
  LOGIN_FAIL: 'Échec connexion',
  LOGOUT: 'Déconnexion',
  RESTORE: 'Restauration',
  PURGE: 'Suppression définitive',
  STATUS: 'Changement de statut',
};

function labelAction(action) {
  if (!action) return '—';
  return ACTION_LABELS[action] || action;
}

/**
 * Enregistre une action dans audit_logs.
 * Ne fait jamais échouer l'opération métier.
 */
async function logAction({
  userId = null,
  module = null,
  action = null,
  ip = null,
  userAgent = null,
  oldValue = null,
  newValue = null,
} = {}) {
  try {
    // JSONB : passer l'objet ; le driver pg sérialise. String OK aussi.
    const oldV = oldValue == null ? null : typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue);
    const newV = newValue == null ? null : typeof newValue === 'string' ? newValue : JSON.stringify(newValue);

    await pool.query(
      `INSERT INTO audit_logs
        (user_id, module_name, action, old_value, new_value, ip, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, module, action, oldV, newV, ip, userAgent]
    );
  } catch (e) {
    logger.warn('audit.service.logAction: écriture échouée');
    logger.debug(String(e.message || e));
  }
}

/**
 * Liste paginée. Accepte page OU offset.
 * Retourne { items, page, limit, total, totalPages }
 */
async function listLogs({ module, action, limit = 15, offset = 0, page } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 15, 1), 100);
  let off = Number(offset) || 0;
  let pageNum = Number(page) || 0;
  if (pageNum > 0) {
    off = (pageNum - 1) * lim;
  } else {
    pageNum = Math.floor(off / lim) + 1;
  }

  let where = ' WHERE 1=1 ';
  const params = [];
  if (module) {
    where += ' AND a.module_name = ? ';
    params.push(module);
  }
  if (action) {
    where += ' AND a.action = ? ';
    params.push(action);
  }

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM audit_logs a ${where}`,
    params
  );
  // MySQL may not like ::int
  let total = Number(countRows[0]?.total ?? countRows[0]?.count ?? 0);
  if (!total && countRows[0]) {
    total = Number(Object.values(countRows[0])[0]) || 0;
  }

  const [rows] = await pool.query(
    `SELECT a.*,
            u.nom AS user_nom,
            u.prenom AS user_prenom,
            u.email AS user_email
     FROM audit_logs a
     LEFT JOIN utilisateur u ON a.user_id = u.id_utilisateur
     ${where}
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, lim, off]
  );

  const items = (rows || []).map((r) => ({
    ...r,
    action_label: labelAction(r.action),
    auteur:
      [r.user_prenom, r.user_nom].filter(Boolean).join(' ').trim() ||
      r.user_email ||
      (r.user_id != null ? 'Utilisateur #' + r.user_id : 'Système'),
  }));

  return {
    items,
    page: pageNum,
    limit: lim,
    offset: off,
    total,
    totalPages: Math.max(1, Math.ceil(total / lim) || 1),
  };
}

module.exports = { logAction, listLogs, labelAction };