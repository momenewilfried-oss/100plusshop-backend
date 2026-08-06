// Facade/logger helper. Wraps src/utils/logger.js and exposes middleware.
const base = require('../utils/logger');

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    base.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
}

module.exports = {
  info: base.info,
  warn: base.warn,
  error: base.error,
  debug: base.debug,
  requestLogger,
};
