function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return String(password).length >= 8;
}

module.exports = { normalizeEmail, validateEmail, validatePassword };