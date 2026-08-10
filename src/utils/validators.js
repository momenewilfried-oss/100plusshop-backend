/**
 * Validateurs partagés — email, téléphone, pourcentages
 */

function normalizeEmail(email) {
  if (email == null || email === '') return null;
  return String(email).trim().toLowerCase();
}

/**
 * Email strict : local@domaine.tld (au moins un point dans le domaine)
 */
function isValidEmail(email) {
  if (email == null || email === '') return false;
  const e = String(email).trim();
  // Refuse sans @, sans domaine, sans TLD
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(
    e
  );
}

/** Si email fourni, doit être valide ; vide/null OK si optionnel */
function assertEmailOptional(email, ApiError) {
  if (email == null || String(email).trim() === '') return null;
  const norm = normalizeEmail(email);
  if (!isValidEmail(norm)) {
    throw new ApiError(400, 'Adresse e-mail invalide (ex. : nom@domaine.com)');
  }
  return norm;
}

/** Email obligatoire et valide */
function assertEmailRequired(email, ApiError) {
  if (email == null || String(email).trim() === '') {
    throw new ApiError(400, 'Adresse e-mail obligatoire');
  }
  const norm = normalizeEmail(email);
  if (!isValidEmail(norm)) {
    throw new ApiError(400, 'Adresse e-mail invalide (ex. : nom@domaine.com)');
  }
  return norm;
}

function normalizePhone(tel) {
  if (tel == null || tel === '') return null;
  // Garde chiffres, +, espaces, tirets
  return String(tel).trim().replace(/\s+/g, ' ');
}

function isValidPhone(tel) {
  if (tel == null || String(tel).trim() === '') return false;
  const digits = String(tel).replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

function assertPhoneOptional(tel, ApiError) {
  if (tel == null || String(tel).trim() === '') return null;
  const n = normalizePhone(tel);
  if (!isValidPhone(n)) {
    throw new ApiError(400, 'Numéro de téléphone invalide (8 à 15 chiffres)');
  }
  return n;
}

/** Pourcentage : 0 < valeur <= 100 */
function assertPourcentage(valeur, ApiError) {
  const v = Number(valeur);
  if (Number.isNaN(v)) throw new ApiError(400, 'Valeur numérique invalide');
  if (v <= 0) throw new ApiError(400, 'Le pourcentage doit être supérieur à 0');
  if (v > 100) throw new ApiError(400, 'Le pourcentage ne peut pas dépasser 100 %');
  return v;
}

/** Montant fixe de promo : > 0 */
function assertMontantPromo(valeur, ApiError) {
  const v = Number(valeur);
  if (Number.isNaN(v) || v <= 0) {
    throw new ApiError(400, 'Le montant de la promotion doit être supérieur à 0');
  }
  return v;
}

module.exports = {
  normalizeEmail,
  isValidEmail,
  assertEmailOptional,
  assertEmailRequired,
  normalizePhone,
  isValidPhone,
  assertPhoneOptional,
  assertPourcentage,
  assertMontantPromo,
};
