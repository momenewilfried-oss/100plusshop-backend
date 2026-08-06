class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const payload = { message: err.message || 'Erreur serveur' };
  if (err.details) {
    payload.details = err.details;
  }
  if (status === 500 && process.env.NODE_ENV === 'production') {
    payload.message = 'Erreur serveur';
  }
  res.status(status).json(payload);
}

module.exports = { ApiError, errorHandler };