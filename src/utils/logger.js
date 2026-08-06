const isProd = process.env.NODE_ENV === 'production';

function formatMessage(level, message) {
  const time = new Date().toISOString();
  return `[${time}] [${level.toUpperCase()}] ${message}`;
}

function info(message) {
  console.log(formatMessage('info', message));
}

function warn(message) {
  console.warn(formatMessage('warn', message));
}

function error(message) {
  console.error(formatMessage('error', message));
}

function debug(message) {
  if (!isProd) {
    console.debug(formatMessage('debug', message));
  }
}

module.exports = { info, warn, error, debug };