# 100PLUSSHOP — Guide client (mono-boutique)

## Démarrage rapide

### 1. Base de données (XAMPP)
1. Démarrer MySQL
2. Créer / utiliser la base `100plusshop_db`
3. Vérifier la table `role` : administrateur, gerant, vendeur

### 2. Backend
```bash
cd 100plusshop-backend
cp .env.example .env
# Éditer .env : DB_PASSWORD, JWT_SECRET
npm install
npm run create-admin admin@boutique.local 'VotreMotDePasse123' Admin Boutique
npm start
```

Vérifier : http://localhost:3000/ et http://localhost:3000/api/health

### 3. Frontend
Servir le dossier `100plusshop-frontend-ready` (Apache, `npx serve`, etc.)  
Ouvrir la page de connexion → se connecter avec le compte admin créé.

### 4. Premiers pas dans l’app
1. **Utilisateurs** → créer un compte **vendeur** pour la caisse  
2. **Produits** → ajouter le catalogue (+ variantes taille/couleur)  
3. **Point de vente** → réaliser une vente test  
4. **Stocks** → vérifier le décrément  

## Rôles

| Rôle | Droits principaux |
|------|-------------------|
| Administrateur | Tout + utilisateurs |
| Gérant | Gestion boutique sans utilisateurs |
| Vendeur | POS, ventes, clients, stocks, factures |

L’inscription publique crée uniquement des **vendeurs**.

## Sauvegarde (importante)
Chaque jour ou chaque semaine :
```bash
mysqldump -u root -p 100plusshop_db > backup_100plusshop_$(date +%Y%m%d).sql
```
Conserver le fichier hors du PC de caisse.

## Production (checklist)
- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` long et unique
- [ ] Mot de passe MySQL fort
- [ ] `CORS_ORIGINS=https://votre-domaine.com`
- [ ] HTTPS (reverse-proxy Nginx / Caddy)
- [ ] Sauvegarde automatique planifiée

## Support
En cas d’erreur : noter le message affiché + l’heure + l’action réalisée.
