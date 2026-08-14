require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./helpers/logger');
const rateLimit = require('express-rate-limit');

let helmet;
try {
  helmet = require('helmet');
} catch {
  helmet = null;
}

const authRoutes = require('./route/auth.route');
const produitsRoutes = require('./route/produit.route');
const ventesRoutes = require('./route/vente.route');
const clientsRoutes = require('./route/client.route');
const stocksRoutes = require('./route/stock.route');
const dashboardRoutes = require('./route/dashboard.route');
const utilisateursRoutes = require('./route/utilisateur.route');
const facturesRoutes = require('./route/facture.route');
const depensesRoutes = require('./route/depense.route');
const rapportsRoutes = require('./route/rapport.route');
const fournisseursRoutes = require('./route/fournisseur.route');
const achatsRoutes = require('./route/achat.route');
const promotionsRoutes = require('./route/promotion.route');
const auditRoutes = require('./route/audit.route');
const corbeilleRoutes = require('./route/corbeille.route');
const marquesRoutes = require('./route/marque.route');
const categoriesRoutes = require('./route/categorie.route');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// ---------- Sécurité HTTP ----------
if (helmet) {
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
}

// ---------- CORS ----------
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (!isProd && allowedOrigins.length === 0) {
      return callback(null, true);
    }

    callback(new Error('Origine non autorisée par CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

// ---------- Rate limiting ----------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_API || 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de requêtes. Réessayez dans une minute.' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// ---------- Logger ----------
app.use((req, res, next) => {
  const debut = Date.now();
  res.on('finish', () => {
    const duree = Date.now() - debut;
    const statut = res.statusCode;
    const user = req.utilisateur
      ? ` [user=${req.utilisateur.id}|${req.utilisateur.role}]`
      : '';
    const line = `${req.method} ${req.originalUrl} ${statut} ${duree}ms${user}`;
    if (statut >= 500) logger.error(line);
    else if (statut >= 400) logger.warn(line);
    else logger.info(line);
  });
  next();
});

// ---------- Routes ----------
app.use('/api/auth', authRoutes);
app.use('/api/produits', produitsRoutes);
app.use('/api/ventes', ventesRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/stocks', stocksRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/utilisateurs', utilisateursRoutes);
app.use('/api/factures', facturesRoutes);
app.use('/api/depenses', depensesRoutes);
app.use('/api/rapports', rapportsRoutes);
app.use('/api/fournisseurs', fournisseursRoutes);
app.use('/api/achats', achatsRoutes);
app.use('/api/promotions', promotionsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/corbeille', corbeilleRoutes);
app.use('/api/marques', marquesRoutes);
app.use('/api/categories', categoriesRoutes);

app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.json({
    message: '100PLUSSHOP API — opérationnelle',
    version: '1.1.0',
    mode: process.env.NODE_ENV || 'development',
  });
});

app.get('/api/health', async (req, res) => {
  try {
    const pool = require('./config/database');
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'up', ts: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ ok: false, db: 'down', message: e.message });
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({
    message: `Route introuvable : ${req.method} ${req.originalUrl}`,
  });
});

const { errorHandler } = require('./utils/error-handler');
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(` 100PLUSSHOP API v1.1.0 — http://localhost:${PORT}`);

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    console.warn('  JWT_SECRET manquant ou trop court');
  }
  if (!helmet) {
    console.warn(
      '  Package "helmet" non installé — npm install helmet express-rate-limit'
    );
  }

  try {
    const pool = require('./config/database');
    await pool.query('SELECT 1 AS ok');
    console.log('  Base de données : OK');
  } catch (e) {
    console.error('  Base de données : ERREUR —', e.message);
    console.error('  Vérifiez DB_HOST / DB_USER / DB_PASSWORD dans .env');
    console.error(
      '  Et que les tables sont importées dans Supabase (SQL Editor).'
    );
  }
});
