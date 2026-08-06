/**
 * Smoke test minimal — vérifie que l'API répond et que la DB est joignable.
 * Usage: node scripts/smoke-test.js
 * Prérequis: serveur démarré sur PORT (défaut 3000)
 */
const http = require('http');

const port = process.env.PORT || 3000;
const base = `http://127.0.0.1:${port}`;

function get(path) {
  return new Promise((resolve, reject) => {
    http
      .get(base + path, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      })
      .on('error', reject);
  });
}

(async () => {
  let failed = 0;

  try {
    const root = await get('/');
    if (root.status === 200) {
      console.log('OK  GET / →', root.status);
    } else {
      console.error('FAIL GET / →', root.status);
      failed++;
    }
  } catch (e) {
    console.error('FAIL GET / → serveur injoignable (' + e.message + ')');
    console.error('   Démarrez d\'abord: npm start');
    process.exit(1);
  }

  try {
    const health = await get('/api/health');
    const json = JSON.parse(health.body || '{}');
    if (health.status === 200 && json.ok) {
      console.log('OK  GET /api/health → db up');
    } else {
      console.error('FAIL GET /api/health →', health.status, health.body);
      failed++;
    }
  } catch (e) {
    console.error('FAIL GET /api/health →', e.message);
    failed++;
  }

  if (failed === 0) {
    console.log('\n✅ Smoke test réussi');
    process.exit(0);
  } else {
    console.error(`\n❌ ${failed} test(s) en échec`);
    process.exit(1);
  }
})();