function toSingleResult(rows) {
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

function hasNoRows(rows) {
  return !Array.isArray(rows) || rows.length === 0;
}

function coalesce(value, fallback) {
  return value != null ? value : fallback;
}

module.exports = { toSingleResult, hasNoRows, coalesce };