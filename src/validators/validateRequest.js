const { ApiError } = require('../utils/error-handler');

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function validateShape(obj, shape, path = '') {
  const errors = [];
  for (const [key, rule] of Object.entries(shape || {})) {
    const fullKey = path ? `${path}.${key}` : key;
    const val = obj ? obj[key] : undefined;

    if (rule.required && (val === undefined || val === null || val === '')) {
      errors.push({ field: fullKey, message: 'Champ requis' });
      continue;
    }
    if (val === undefined || val === null) continue;

    const t = typeOf(val);
    if (rule.type && rule.type !== t) {
      if (!(rule.type === 'number' && t === 'string' && !isNaN(Number(val)))) {
        errors.push({ field: fullKey, message: `Type invalide: attendu ${rule.type}` });
        continue;
      }
    }

    const num = rule.type === 'number' ? Number(val) : null;
    if (rule.type === 'number' && !Number.isNaN(num)) {
      if (rule.min !== undefined && num < rule.min) {
        errors.push({ field: fullKey, message: `Doit être ≥ ${rule.min}` });
      }
      if (rule.max !== undefined && num > rule.max) {
        errors.push({ field: fullKey, message: `Doit être ≤ ${rule.max}` });
      }
    }

    if (rule.maxLength && String(val).length > rule.maxLength) {
      errors.push({ field: fullKey, message: `Trop long (max ${rule.maxLength})` });
    }
    if (rule.minLength && String(val).length < rule.minLength) {
      errors.push({ field: fullKey, message: `Trop court (min ${rule.minLength})` });
    }
    if (rule.enum && !rule.enum.includes(val)) {
      errors.push({ field: fullKey, message: 'Valeur interdite' });
    }
    if (rule.pattern && !new RegExp(rule.pattern).test(String(val))) {
      errors.push({ field: fullKey, message: 'Format invalide' });
    }

    if (rule.properties && t === 'object') {
      errors.push(...validateShape(val, rule.properties, fullKey));
    }
  }
  return errors;
}

function validateRequest(schema = {}) {
  return (req, res, next) => {
    try {
      const errors = [];
      if (schema.params) errors.push(...validateShape(req.params || {}, schema.params, 'params'));
      if (schema.query) errors.push(...validateShape(req.query || {}, schema.query, 'query'));
      if (schema.body) errors.push(...validateShape(req.body || {}, schema.body, 'body'));
      if (errors.length > 0) {
        return next(new ApiError(400, 'Validation échouée', errors));
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { validateRequest, validateShape };