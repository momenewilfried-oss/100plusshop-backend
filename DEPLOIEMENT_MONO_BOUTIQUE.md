# Déploiement mono-boutique — checklist pro

## Install dépendances (v1.1)
```bash
cd 100plusshop-backend
npm install
# installe notamment: helmet, express-rate-limit
```

## Variables `.env`
Voir `.env.example`. Obligatoire en prod :
- `NODE_ENV=production`
- `JWT_SECRET` (≥ 32 caractères)
- `DB_PASSWORD`
- `CORS_ORIGINS`

## Premier administrateur
```bash
npm run create-admin -- admin@boutique.local 'MotDePasseFort123' Admin Boutique
```

## Vérification
```bash
npm start
# autre terminal :
npm run health
```

## Frontend
- Remplacer `js/pages/utilisateurs.js` (création de comptes)
- `js/api.js` contient `escapeHtml` + API_BASE dynamique
- En prod derrière le même domaine : rien à configurer
- Sinon : `<meta name="api-base" content="https://api.exemple.com/api">`

## Sécurité active v1.1
- Rate limit auth (30 / 15 min) et API (300 / min)
- Helmet (en-têtes HTTP)
- Inscription publique = vendeur seul
- Création de rôles = admin seul
- Erreurs 500 masquées en production

## Sauvegarde
```bash
mysqldump -u root -p 100plusshop_db > backup_$(date +%Y%m%d).sql
```
