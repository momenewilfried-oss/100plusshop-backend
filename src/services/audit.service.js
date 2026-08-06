const pool = require('../config/database');
const logger = require('../helpers/logger');

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
    const sql = `INSERT INTO audit_logs
      (user_id, module_name, action, old_value, new_value, ip, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`;
    await pool.query(sql, [
      userId,
      module,
      action,
      oldValue != null ? JSON.stringify(oldValue) : null,
      newValue != null ? JSON.stringify(newValue) : null,
      ip,
      userAgent,
    ]);
  } catch (e) {
    logger.warn('audit.service.logAction: écriture échouée - audit_logs manquant ou erreur DB');
    logger.debug(String(e));
  }
}

async function listLogs({ module, action, limit = 100, offset = 0 } = {}) {
  let sql = `
    SELECT a.*, u.nom AS user_nom, u.prenom AS user_prenom, u.email AS user_email
    FROM audit_logs a
    LEFT JOIN utilisateur u ON a.user_id = u.id_utilisateur
    WHERE 1=1
  `;
  const params = [];
  if (module) {
    sql += ' AND a.module_name = ?';
    params.push(module);
  }
  if (action) {
    sql += ' AND a.action = ?';
    params.push(action);
  }
  sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit) || 100, Number(offset) || 0);
  const [rows] = await pool.query(sql, params);
  return rows;
}

module.exports = { logAction, listLogs };