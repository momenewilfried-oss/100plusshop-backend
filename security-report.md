# Security Analysis Report — 100PLUSSHOP

Date: 2026-08-05

Résumé exécutif
- L'application possède déjà une bonne base (transactionnel pour ventes/achats, middleware auth/role, errorHandler central, helmet/cors/rate-limit support dans `app.js`).
- Points critiques à traiter rapidement: absence de validation centralisée, suppressions physiques (hard delete), absence d'audit logging.
- Objectif: corrections progressives, rétrocompatibles et non intrusives.

Findings principaux

1) Validation centralisée manquante (P1)
- Constat: seul `src/validators/auth.validator.js` existe. La majorité des contrôleurs acceptent `req.body` sans schéma.
- Risque: données invalides, injections, comportement métier incohérent.
- Correctif recommandé: ajouter `validators/` et un middleware `validateRequest(schema)` et commencer par les endpoints les plus sensibles (`auth`, `vente`, `achat`, `facture`, `produit`).

2) Suppressions physiques (hard delete) (P1)
- Constat: `src/repositories/produit.repository.js::deleteProduct`, `src/repositories/utilisateur.repository.js::deleteUser` utilisent `DELETE FROM`.
- Risque: perte irréversible de données, compliquant forensic et restauration.
- Correctif recommandé: migration DB ajoutant `deleted_at DATETIME NULL, deleted_by INT NULL` et adapter repositories pour soft-delete.

3) Absence d'audit log centralisé (P1)
- Constat: aucune table/flux d'audit détectés.
- Risque: non-conformité, impossibilité de tracer actions critiques.
- Correctif recommandé: créer table `audit_logs` et `src/services/audit.service.js`, puis instrumenter login, CRUD critiques et exports.

4) Middlewares d'auth retournant réponses directes (P2)
- Constat: `src/middleware/auth.middleware.js` et `role.middleware.js` renvoient directement `res.status(...).json(...)`.
- Risque: incohérence de format d'erreur, duplication de try/catch.
- Correctif recommandé: lever des erreurs `AuthenticationError`/`AuthorizationError` via `next(err)` et laisser `errorHandler` formater la réponse.

5) Logger et tonalité des logs (P2)
- Constat: `src/utils/logger.js` existe; `app.js` utilise `console.log` pour accès.
- Correctif recommandé: créer `src/helpers/logger.js` façade sur `src/utils/logger.js` et migrer les logs critiques progressivement.

6) Sécurité HTTP (P2)
- Constat: `app.js` inclut helmet/cors/rate-limit conditionnels; helmet peut être absent.
- Correctif recommandé: s'assurer que helmet est installé en prod, définir `CORS_ORIGINS` en prod, activer CSP si besoin.

Plan d'action progressif (séquences de PRs non intrusives)

- Phase 0 — Analyse (actuelle): générer ce rapport et une liste d'endpoints prioritaires.
- Phase 1 — Scaffolding non branchant:
  - Ajouter `src/validators/` (scaffolding + middleware `validateRequest`) — ne brancher aucune route.
  - Ajouter `src/utils/errors.js` (sous-classes) et garder `error-handler.js` mais mettre à jour progressivement.
  - Ajouter `src/services/audit.service.js` et `migrations/001_create_audit_logs.sql` (non exécutés).
  - Ajouter `src/helpers/logger.js` facade.
- Phase 2 — Hardening incrémental:
  - Brancher validation sur endpoints critiques (auth, vente, achat, facture, produit) via PRs séparés.
  - Remplacer `DELETE` par soft-delete dans repositories par PRs isolés (une entité par PR).
  - Remplacer usages auth middleware pour lever erreurs via `next()` (PR unique, tests).
  - Instrumenter audit logging sur actions CRUD critiques.
- Phase 3 — Polissage et infra:
  - Activer CSP/helmet/config CORS en prod.
  - Évaluer dépendances via `npm audit` et appliquer correctifs raisonnés.
  - Ajouter tests smoke et security pipeline (SAST, npm audit, secret-scan).

Commandes recommandées pour environnement local
```bash
npm install
npm audit --json > audit.json
node scripts/smoke-test.js
``` 

Livrables que je peux créer maintenant (non intrusifs)
- `src/validators/` scaffolding + `validateRequest` middleware
- `src/utils/errors.js` contenant sous-classes
- `src/services/audit.service.js` scaffold
- `migrations/001_create_audit_logs.sql` template
- `src/helpers/logger.js` facade
- `security-analysis.json` (fichier généré)

Souhaitez-vous que je commence par générer ces fichiers scaffolding (sans brancher), ou préférez-vous que j'exécute d'abord `npm audit` et joigne le rapport `audit.json` ?

---
Fin du rapport initial.
