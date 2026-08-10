/**
 * PostgreSQL (Supabase) — API compatible mysql2
 * const [rows] = await pool.query(sql, params)
 * result.insertId / result.affectedRows sur INSERT/UPDATE/DELETE
 */
const path = require('path');
const { Pool } = require('pg');

// Charge le .env à la racine du projet
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const useSSL =
  process.env.DB_SSL === 'true' ||
  String(process.env.DB_HOST || '').includes('supabase') ||
  String(process.env.DATABASE_URL || '').includes('supabase');

function buildPoolConfig() {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) {
    return {
      connectionString: process.env.DATABASE_URL.trim(),
      ssl: useSSL ? { rejectUnauthorized: false } : false,
      max: Number(process.env.DB_POOL_LIMIT || 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT || 15000),
    };
  }

  const host = process.env.DB_HOST;
  const password = process.env.DB_PASSWORD;

  if (!host) {
    console.error('[pg] DB_HOST manquant dans .env');
  }
  if (password === undefined || password === '') {
    console.warn('[pg] DB_PASSWORD vide — vérifiez votre .env');
  }

  return {
    host,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: password == null ? '' : String(password),
    ssl: useSSL ? { rejectUnauthorized: false } : false,
    max: Number(process.env.DB_POOL_LIMIT || 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT || 15000),
  };
}

const pool = new Pool(buildPoolConfig());

pool.on('error', (err) => {
  console.error('[pg] erreur connexion idle:', err.message);
});

/** ? → $1, $2, ... */
function toPgParams(sql) {
  let i = 0;
  return String(sql).replace(/\?/g, () => `$${++i}`);
}

/** Adaptations MySQL → PostgreSQL */
function adaptSql(sql) {
  let s = String(sql);

  // Colonnes camelCase (mouvement_stock / paiement)
  const camel = [
    'idMouvement',
    'typeMouvement',
    'documentType',
    'documentId',
    'dateMouvement',
    'uuidLocal',
    'idPaiement',
    'typePaiement',
    'datePaiement',
  ];
  for (const col of camel) {
    s = s.replace(new RegExp('\\b' + col + '\\b', 'g'), '"' + col + '"');
  }

  // DATE_SUB / DATE_ADD
  s = s.replace(
    /DATE_SUB\s*\(\s*CURDATE\s*\(\s*\)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi,
    "(CURRENT_DATE - INTERVAL '$1 days')"
  );
  s = s.replace(
    /DATE_SUB\s*\(\s*([^,]+)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi,
    "($1 - INTERVAL '$2 days')"
  );
  s = s.replace(
    /DATE_ADD\s*\(\s*CURDATE\s*\(\s*\)\s*,\s*INTERVAL\s+(\d+)\s+MONTH\s*\)/gi,
    "(CURRENT_DATE + INTERVAL '$1 months')"
  );
  s = s.replace(
    /DATE_ADD\s*\(\s*([^,]+)\s*,\s*INTERVAL\s+(\d+)\s+MONTH\s*\)/gi,
    "($1 + INTERVAL '$2 months')"
  );

  // CURDATE
  s = s.replace(/\bCURDATE\s*\(\s*\)/gi, 'CURRENT_DATE');

  // MONTH / YEAR
  s = s.replace(/\bMONTH\s*\(\s*([^)]+)\s*\)/gi, 'EXTRACT(MONTH FROM $1)');
  s = s.replace(/\bYEAR\s*\(\s*([^)]+)\s*\)/gi, 'EXTRACT(YEAR FROM $1)');

  // DATE(col)
  s = s.replace(/\bDATE\s*\(\s*([^)]+)\s*\)/gi, '(($1)::date)');

  // DATE_FORMAT(..., '%Y-%m-01')
  s = s.replace(
    /DATE_FORMAT\s*\(\s*CURDATE\s*\(\s*\)\s*,\s*'%Y-%m-01'\s*\)/gi,
    "date_trunc('month', CURRENT_DATE)::date"
  );
  s = s.replace(
    /DATE_FORMAT\s*\(\s*([^,]+)\s*,\s*'%Y-%m-01'\s*\)/gi,
    "date_trunc('month', $1)::date"
  );

  // IFNULL / CEILING (MySQL)
  s = s.replace(/\bIFNULL\s*\(/gi, 'COALESCE(');
  s = s.replace(/\bCEILING\s*\(/gi, 'CEIL(');

  // INSERT → RETURNING * (pour récupérer insertId)
  if (/^\s*INSERT\s+/i.test(s) && !/\bRETURNING\b/i.test(s)) {
    s = s.replace(/;?\s*$/, '') + ' RETURNING *';
  }

  return s;
}

function wrapResult(pgResult) {
  const rows = pgResult.rows || [];
  const rowCount = pgResult.rowCount || 0;
  const command = (pgResult.command || '').toUpperCase();

  let insertId;
  if (rows[0]) {
    const r = rows[0];
    /**
     * Clés PRIMAIRES en premier.
     * Ne jamais mettre id_client / id_fournisseur / id_vendeur
     * avant id_vente / id_facture_achat, sinon insertId = la FK
     * → violation sur detail_vente / detail_achat.
     */
    const PK_KEYS = [
      'id_facture_achat',
      'id_detail_achat',
      'id_vente',
      'id_detail',
      'id_facture',
      'id_promotion',
      'id_produit',
      'id_variante',
      'id_depense',
      'id_utilisateur',
      'id_client',
      'id_fournisseur',
      'idMouvement',
      'idPaiement',
      'id',
    ];
    for (const k of PK_KEYS) {
      if (r[k] != null && r[k] !== '') {
        const n = Number(r[k]);
        if (!Number.isNaN(n)) {
          insertId = n;
          break;
        }
      }
    }
    if (insertId == null) {
      const first = Object.values(r)[0];
      if (first != null) insertId = Number(first);
    }
  }

  if (command === 'SELECT') {
    return rows;
  }

  if (command === 'INSERT' || command === 'UPDATE' || command === 'DELETE') {
    return Object.assign(rows.slice(), {
      insertId,
      affectedRows: rowCount,
      rowCount,
      rows,
    });
  }

  return rows;
}

async function query(sql, params = []) {
  try {
    const text = toPgParams(adaptSql(sql));
    const result = await pool.query(text, params);
    return [wrapResult(result), result];
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    if (
      /ENOTFOUND|ECONNREFUSED|timeout|password authentication|does not exist/i.test(
        msg
      )
    ) {
      console.error('[pg] query error:', msg);
    }
    throw err;
  }
}

async function getConnection() {
  const client = await pool.connect();
  let inTx = false;

  return {
    async query(sql, params = []) {
      const text = toPgParams(adaptSql(sql));
      const result = await client.query(text, params);
      return [wrapResult(result), result];
    },
    async beginTransaction() {
      await client.query('BEGIN');
      inTx = true;
    },
    async commit() {
      await client.query('COMMIT');
      inTx = false;
    },
    async rollback() {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
      inTx = false;
    },
    release() {
      if (inTx) {
        client
          .query('ROLLBACK')
          .catch(() => {})
          .finally(() => client.release());
        inTx = false;
      } else {
        client.release();
      }
    },
  };
}

module.exports = {
  query,
  getConnection,
  end: () => pool.end(),
  pool,
};