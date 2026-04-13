# ✅ Checklist de Déploiement Orchestra

Guide étape par étape pour déployer Orchestra en production.

## 🎯 Vue d'ensemble

**Durée estimée** : 2-3 heures  
**Prérequis** : Comptes créés sur Sentry, Supabase, Railway, Stripe, GitHub  

---

## 📋 Phase 1 : Configuration des Services (45min)

### ✅ 1.1 Sentry (10min)

**Status actuel** : 1/2 tokens configurés (Auth token ✅)

- [ ] Créer projet "Orchestra" sur https://sentry.io/organizations/adrien-debug/projects/
- [ ] Créer projet "Clawd" sur https://sentry.io/organizations/adrien-debug/projects/
- [ ] Récupérer DSN Orchestra
- [ ] Configurer : `npm run tokens set sentry dsn "https://xxx@sentry.io/xxx"`
- [ ] Vérifier : `npm run tokens show sentry`

### ⚠️ 1.2 Supabase (15min)

**Status actuel** : 0/3 tokens configurés

- [ ] Créer projet "Orchestra" sur https://app.supabase.com
- [ ] Région : Europe (eu-central-1)
- [ ] Récupérer URL : https://app.supabase.com/project/_/settings/api
- [ ] Récupérer Anon key
- [ ] Récupérer Service Role key
- [ ] Configurer :
  ```bash
  npm run tokens set supabase url "https://xxxxx.supabase.co"
  npm run tokens set supabase anon "eyJ..."
  npm run tokens set supabase service "eyJ..."
  ```
- [ ] Exécuter SQL : `scripts/setup-supabase.sql` sur https://app.supabase.com/project/_/sql
- [ ] Vérifier tables créées : users, sessions, actions, metrics
- [ ] Vérifier : `npm run tokens show supabase`

### ⚠️ 1.3 Stripe (10min)

**Status actuel** : 0/3 tokens configurés

- [ ] Créer produit "Pro Plan" (9.99€/mois) sur https://dashboard.stripe.com/test/products
- [ ] Créer produit "Team Plan" (29.99€/mois)
- [ ] Récupérer Price IDs (price_xxx, price_yyy)
- [ ] Récupérer API keys : https://dashboard.stripe.com/test/apikeys
- [ ] Configurer :
  ```bash
  npm run tokens set stripe secret "sk_test_..."
  npm run tokens set stripe publishable "pk_test_..."
  ```
- [ ] Éditer `config/TOKENS-CONFIG.json` avec les Price IDs
- [ ] Vérifier : `npm run tokens show stripe`

### ⚠️ 1.4 GitHub OAuth (5min)

**Status actuel** : 0/3 tokens configurés

- [ ] Créer OAuth App sur https://github.com/settings/developers
- [ ] Application name : Orchestra
- [ ] Homepage URL : https://orchestra.vercel.app (temporaire)
- [ ] Callback URL : http://localhost:3011/api/auth/github/callback (temporaire)
- [ ] Récupérer Client ID et Secret
- [ ] Configurer :
  ```bash
  npm run tokens set github oauth_client_id "Iv1..."
  npm run tokens set github oauth_client_secret "..."
  ```
- [ ] Vérifier : `npm run tokens show github`

### ⚠️ 1.5 OpenAI (2min)

**Status actuel** : 0/1 tokens configurés

- [ ] Récupérer API key : https://platform.openai.com/api-keys
- [ ] Configurer : `npm run tokens set openai api_key "sk-..."`
- [ ] Vérifier : `npm run tokens show openai`

### ⚠️ 1.6 Anthropic (2min)

**Status actuel** : 0/1 tokens configurés

- [ ] Récupérer API key : https://console.anthropic.com/settings/keys
- [ ] Configurer : `npm run tokens set anthropic api_key "sk-ant-..."`
- [ ] Vérifier : `npm run tokens show anthropic`

### ✅ Vérification Phase 1

```bash
npm run tokens:status
# Devrait afficher : 13/13 tokens configured (100%)
```

---

## 🗄️ Phase 2 : Base de Données (15min)

### 2.1 Supabase Schema

- [ ] Ouvrir SQL Editor : https://app.supabase.com/project/_/sql
- [ ] Copier le contenu de `scripts/setup-supabase.sql`
- [ ] Exécuter le script
- [ ] Vérifier les tables créées :
  - [ ] users
  - [ ] sessions
  - [ ] actions
  - [ ] metrics
- [ ] Vérifier RLS activé sur toutes les tables
- [ ] Vérifier les indexes créés

### 2.2 Test Connection

```bash
# Générer .env.development
npm run tokens:dev

# Tester la connection
cd backend
npm run dev

# Dans un autre terminal
curl http://localhost:3011/health
# Devrait retourner : {"status":"ok"}
```

---

## 🚂 Phase 3 : Déploiement Railway (30min)

### 3.1 Installation Railway CLI

```bash
# macOS
brew install railway

# npm
npm install -g @railway/cli

# Login
railway login
```

### 3.2 Orchestra Backend

```bash
cd backend

# Initialiser
railway init
# Nom : orchestra-backend

# Configurer automatiquement
cd ..
./scripts/setup-railway.sh

# Ou manuellement :
railway variables set NODE_ENV=production
railway variables set PORT=3011
railway variables set SUPABASE_URL="..."
railway variables set SUPABASE_SERVICE_KEY="..."
railway variables set JWT_SECRET="$(openssl rand -base64 32)"
railway variables set GITHUB_CLIENT_ID="..."
railway variables set GITHUB_CLIENT_SECRET="..."
railway variables set STRIPE_SECRET_KEY="..."
railway variables set STRIPE_WEBHOOK_SECRET="..."
railway variables set STRIPE_PRICE_PRO="..."
railway variables set STRIPE_PRICE_TEAM="..."
railway variables set FRONTEND_URL="https://orchestra.vercel.app"
railway variables set SENTRY_DSN="..."

# Déployer
railway up

# Récupérer l'URL
railway domain
# Exemple : orchestra-backend-production.up.railway.app
```

### 3.3 Vérification

```bash
# Health check
curl https://orchestra-backend-production.up.railway.app/health

# Logs
railway logs
```

---

## 🌐 Phase 4 : Déploiement Frontend (20min)

### 4.1 Installation Vercel CLI

```bash
# npm
npm install -g vercel

# Login
vercel login
```

### 4.2 Landing Page

```bash
cd landing

# Déployer
vercel --prod

# Configurer variables d'environnement
vercel env add NEXT_PUBLIC_API_URL production
# Valeur : https://orchestra-backend-production.up.railway.app

vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
# Valeur : pk_test_... (ou pk_live_... en prod)

# Redéployer avec les nouvelles variables
vercel --prod
```

### 4.3 Mettre à jour GitHub OAuth

- [ ] Aller sur https://github.com/settings/developers
- [ ] Éditer l'OAuth App "Orchestra"
- [ ] Homepage URL : https://orchestra.vercel.app
- [ ] Callback URL : https://orchestra-backend-production.up.railway.app/api/auth/github/callback
- [ ] Sauvegarder

### 4.4 Mettre à jour Railway FRONTEND_URL

```bash
cd backend
railway variables set FRONTEND_URL="https://orchestra.vercel.app"
railway up
```

---

## 🔌 Phase 5 : Configuration Stripe Webhook (10min)

### 5.1 Créer le webhook

- [ ] Aller sur https://dashboard.stripe.com/test/webhooks
- [ ] Créer endpoint : https://orchestra-backend-production.up.railway.app/api/billing/webhook
- [ ] Événements à écouter :
  - [ ] checkout.session.completed
  - [ ] customer.subscription.created
  - [ ] customer.subscription.updated
  - [ ] customer.subscription.deleted
- [ ] Récupérer le Webhook Secret (whsec_...)

### 5.2 Configurer le secret

```bash
npm run tokens set stripe webhook "whsec_..."

# Mettre à jour Railway
cd backend
railway variables set STRIPE_WEBHOOK_SECRET="whsec_..."
railway up
```

---

## 🧪 Phase 6 : Tests de Production (15min)

### 6.1 Health Checks

```bash
# Backend
curl https://orchestra-backend-production.up.railway.app/health
# ✅ {"status":"ok"}

# Database
curl https://orchestra-backend-production.up.railway.app/api/health/db
# ✅ {"status":"ok","database":"connected"}

# Frontend
curl https://orchestra.vercel.app
# ✅ 200 OK
```

### 6.2 Test OAuth Flow

1. Ouvrir https://orchestra.vercel.app
2. Cliquer "Sign in with GitHub"
3. Autoriser l'application
4. Vérifier redirection vers dashboard
5. Vérifier user créé dans Supabase

### 6.3 Test Stripe

1. Cliquer "Upgrade to Pro"
2. Utiliser carte test : 4242 4242 4242 4242
3. Vérifier redirection vers success page
4. Vérifier subscription créée dans Stripe
5. Vérifier user mis à jour dans Supabase

### 6.4 Test Sentry

```bash
# Déclencher une erreur test
curl https://orchestra-backend-production.up.railway.app/api/test/sentry-error

# Vérifier sur Sentry
open https://sentry.io/organizations/adrien-debug/issues/
```

---

## 📦 Phase 7 : Build Electron (20min)

### 7.1 Build pour toutes les plateformes

```bash
# macOS
npm run dist:mac

# Windows (depuis macOS avec wine)
npm run dist:win

# Linux
npm run dist:linux

# Toutes les plateformes
npm run dist:all
```

### 7.2 Publier sur GitHub Releases

```bash
# Créer un tag
git tag v0.1.0
git push origin v0.1.0

# Créer la release
gh release create v0.1.0 \
  dist/*.dmg \
  dist/*.exe \
  dist/*.AppImage \
  --title "Orchestra v0.1.0" \
  --notes "$(cat <<EOF
# Orchestra v0.1.0 - Initial Release

## Features
- Real-time process monitoring
- Intelligent agents (Preventive, Auto-Fix)
- Multi-provider AI chat
- Service orchestration
- Port management
- Docker integration

## Downloads
- macOS: Orchestra-0.1.0.dmg
- Windows: Orchestra-Setup-0.1.0.exe
- Linux: Orchestra-0.1.0.AppImage

## Installation
See README.md for installation instructions.
EOF
)"
```

---

## 🔄 Phase 8 : CI/CD (15min)

### 8.1 GitHub Actions

Créer `.github/workflows/deploy.yml` :

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm install
      - run: npm test
      - run: npm run typecheck

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          cd backend
          railway up --detach
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - name: Deploy to Vercel
        run: |
          npm install -g vercel
          cd landing
          vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

### 8.2 Configurer les secrets GitHub

```bash
# Railway token
gh secret set RAILWAY_TOKEN

# Vercel token
gh secret set VERCEL_TOKEN
```

---

## 📊 Phase 9 : Monitoring (10min)

### 9.1 Sentry Alerts

- [ ] Configurer alertes email : https://sentry.io/settings/adrien-debug/alerts/
- [ ] Seuil : 10 erreurs en 1 heure
- [ ] Notification : Email + Slack (optionnel)

### 9.2 Railway Metrics

- [ ] Activer métriques : https://railway.app/project/orchestra-backend/metrics
- [ ] Configurer alertes :
  - [ ] CPU > 80%
  - [ ] Memory > 80%
  - [ ] Crash/restart

### 9.3 Supabase Monitoring

- [ ] Activer Database Webhooks : https://app.supabase.com/project/_/database/webhooks
- [ ] Configurer alertes :
  - [ ] Connexions > 80%
  - [ ] Storage > 80%

---

## ✅ Phase 10 : Vérification Finale (10min)

### 10.1 Tokens Status

```bash
npm run tokens:status
# ✅ 13/13 tokens configured (100%)
```

### 10.2 Services Status

```bash
npm run ports:list
# ✅ Tous les services listés
```

### 10.3 Tests

```bash
npm test
# ✅ 158 tests passing
```

### 10.4 TypeScript

```bash
npm run typecheck
# ✅ 0 errors
```

### 10.5 Build

```bash
npm run build
# ✅ Build successful
```

### 10.6 Déploiements

- [ ] Backend Railway : https://orchestra-backend-production.up.railway.app/health
- [ ] Frontend Vercel : https://orchestra.vercel.app
- [ ] Sentry monitoring : https://sentry.io/organizations/adrien-debug/issues/
- [ ] Supabase database : https://app.supabase.com/project/_/editor

---

## 🎯 Commandes Rapides

### Configuration

```bash
# Voir le statut
npm run tokens:status

# Configurer un token
npm run tokens set <service> <token> "<value>"

# Générer .env
npm run tokens:dev
npm run tokens:staging
npm run tokens:prod
```

### Déploiement

```bash
# Déployer tout (dev)
npm run deploy:dev

# Déployer tout (staging)
npm run deploy:staging

# Déployer tout (production)
npm run deploy:prod

# Déployer backend uniquement
npm run deploy:prod --backend-only

# Déployer frontend uniquement
npm run deploy:prod --frontend-only
```

### Railway

```bash
# Setup Railway
./scripts/setup-railway.sh

# Déployer backend
cd backend && railway up

# Voir les logs
railway logs

# Voir les variables
railway variables
```

### Tests

```bash
# Tests
npm test

# Tests backend
npm test --prefix backend

# TypeScript
npm run typecheck
```

---

## 🆘 Troubleshooting

### Tokens manquants

```bash
npm run tokens:status
npm run tokens show <service>
npm run tokens set <service> <token> "<value>"
```

### Railway deployment failed

```bash
railway logs
railway variables
railway up --force
```

### Supabase connection failed

```bash
npm run tokens show supabase
curl https://xxxxx.supabase.co/rest/v1/
```

### Stripe webhook errors

```bash
stripe listen --forward-to localhost:3011/api/billing/webhook
```

---

## 📈 Métriques de Succès

- [ ] ✅ 13/13 tokens configurés (100%)
- [ ] ✅ 158 tests passing
- [ ] ✅ 0 TypeScript errors
- [ ] ✅ Backend déployé sur Railway
- [ ] ✅ Frontend déployé sur Vercel
- [ ] ✅ Database Supabase opérationnelle
- [ ] ✅ Sentry monitoring actif
- [ ] ✅ Stripe payments fonctionnels
- [ ] ✅ GitHub OAuth fonctionnel
- [ ] ✅ CI/CD configuré

---

**Date** : 13 avril 2026  
**Version** : 1.0.0  
**Status** : Ready for deployment 🚀
