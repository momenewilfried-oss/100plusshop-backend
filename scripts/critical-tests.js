/**
 * Tests critiques HTTP (sans framework).
 * Prérequis: serveur démarré (npm start) + MySQL
 *
 * Usage:
 *   set TEST_EMAIL=admin@boutique.local
 *   set TEST_PASSWORD=MotDePasseFort123
 *   node scripts/critical-tests.js
 */
const http = require('http');

const port = process.env.PORT || 3000;
const email = process.env.TEST_EMAIL || 'admin@boutique.local';
const password = process.env.TEST_PASSWORD || '';

let passed = 0;
let failed = 0;

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          Accept: 'application/json',
          ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let json = {};
          try {
            json = JSON.parse(raw || '{}');
          } catch {
            json = { raw };
          }
          resolve({ status: res.statusCode, json });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function ok(name, cond, detail) {
  if (cond) {
    console.log('  OK  ', name);
    passed++;
  } else {
    console.log('  FAIL', name, detail || '');
    failed++;
  }
}

(async () => {
  console.log('=== Tests critiques 100PLUSSHOP ===\n');

  // 1. Health
  try {
    const h = await request('GET', '/api/health');
    ok('API + DB up', h.status === 200 && h.json.ok === true, h.status);
  } catch (e) {
    console.error('Serveur injoignable. Lance: npm start');
    process.exit(1);
  }

  // 2. Root
  const root = await request('GET', '/');
  ok('GET / répond', root.status === 200);

  // 3. Login sans body
  const bad = await request('POST', '/api/auth/connexion', {});
  ok('Login sans body → 400', bad.status === 400);

  // 4. Login mauvais mdp
  if (email) {
    const wrong = await request('POST', '/api/auth/connexion', {
      email,
      motDePasse: 'mot_de_passe_incorrect_xyz',
    });
    ok('Mauvais mdp → 401 ou 429', wrong.status === 401 || wrong.status === 429, wrong.status);
  }

  // 5. Login admin (si credentials fournis)
  let token = null;
  let role = null;
  if (password) {
    const login = await request('POST', '/api/auth/connexion', {
      email,
      motDePasse: password,
    });
    ok('Login admin → 200 + token', login.status === 200 && !!login.json.token, login.status);
    token = login.json.token;
    role = login.json.utilisateur?.role;
  } else {
    console.log('  SKIP login admin (définis TEST_PASSWORD)');
  }

  if (token) {
    // 6. Dashboard authentifié
    const dash = await request('GET', '/api/dashboard', null, token);
    ok('Dashboard avec token → 200', dash.status === 200, dash.status);

    // 7. Sans token
    const noAuth = await request('GET', '/api/dashboard');
    ok('Dashboard sans token → 401', noAuth.status === 401, noAuth.status);

    // 8. Liste produits
    const prod = await request('GET', '/api/produits', null, token);
    ok('Liste produits → 200', prod.status === 200 && Array.isArray(prod.json), prod.status);

    // 9. Utilisateurs (admin only)
    const users = await request('GET', '/api/utilisateurs', null, token);
    const isAdmin = String(role || '').toLowerCase().includes('admin');
    if (isAdmin) {
      ok('Admin accède /utilisateurs → 200', users.status === 200, users.status);
    } else {
      ok('Non-admin /utilisateurs → 403', users.status === 403, users.status);
    }

    // 10. Route inexistante
    const nf = await request('GET', '/api/route-qui-nexiste-pas', null, token);
    ok('404 API', nf.status === 404);
  }

  console.log(`\n=== Résultat: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
