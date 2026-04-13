# 🚀 Déploiement Orchestra

Guide complet de déploiement pour Orchestra en production.

## 📋 Prérequis

- [x] Compte Sentry (https://sentry.io)
- [x] Compte Supabase (https://supabase.com)
- [x] Compte Railway (https://railway.app)
- [x] Compte Stripe (https://stripe.com)
- [x] Compte GitHub (https://github.com)
- [x] Token Sentry configuré ✅

## 🎯 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     PRODUCTION                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐      ┌──────────────┐               │
│  │   Frontend   │─────▶│   Backend    │               │
│  │   (Vercel)   │      │  (Railway)   │               │
│  └──────────────┘      └──────────────┘               │
│         │                      │                        │
│         │                      ▼                        │
│         │              ┌──────────────┐                │
│         │              │   Supabase   │                │
│         │              │  (Database)  │                │
│         │              └──────────────┘                │
│         │                                               │
│         ▼                                               │
│  ┌──────────────┐      ┌──────────────┐               │
│  │    Stripe    │      │    Sentry    │               │
│  │  (Payments)  │      │   (Errors)   │               │
│  └──────────────┘      └──────────────┘               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 🔧 Étape 1 : Configuration Sentry

### 1.1 Créer les projets

```bash
# Utiliser le token déjà configuré
npm run tokens show sentry

# Créer les projets via UI ou CLI
# Orchestra: https://sentry.io/organizations/adrien-debug/projects/
# Clawd: https://sentry.io/organizations/adrien-debug/projects/
```

### 1.2 Récupérer les DSN

```bash
# Après création des projets, récupérer les DSN
# Orchestra DSN: https://xxx@sentry.io/xxx
# Clawd DSN: https://yyy@sentry.io/yyy

# Configurer
npm run tokens set sentry dsn "https://xxx@sentry.io/xxx"
```

## 🗄️ Étape 2 : Configuration Supabase

### 2.1 Créer le projet

1. Aller sur https://app.supabase.com
2. Créer un nouveau projet "Orchestra"
3. Région : Europe (eu-central-1)
4. Database password : Générer un mot de passe fort

### 2.2 Configurer les tokens

```bash
# Récupérer sur https://app.supabase.com/project/_/settings/api
npm run tokens set supabase url "https://xxxxx.supabase.co"
npm run tokens set supabase anon "eyJ..."
npm run tokens set supabase service "eyJ..."
```

### 2.3 Créer les tables

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  github_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'inactive',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Indexes
CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);
```

## 💳 Étape 3 : Configuration Stripe

### 3.1 Créer les produits

1. Aller sur https://dashboard.stripe.com/test/products
2. Créer "Pro Plan" : 9.99€/mois
3. Créer "Team Plan" : 29.99€/mois

### 3.2 Configurer les tokens

```bash
# Récupérer sur https://dashboard.stripe.com/test/apikeys
npm run tokens set stripe secret "sk_test_..."
npm run tokens set stripe publishable "pk_test_..."

# Créer webhook endpoint : https://your-backend.railway.app/api/billing/webhook
# Récupérer le webhook secret
npm run tokens set stripe webhook "whsec_..."
```

### 3.3 Mettre à jour les Price IDs

Éditer `config/TOKENS-CONFIG.json` :
```json
{
  "tokens": {
    "stripe": {
      "products": {
        "pro": {
          "priceId": "price_xxx",
          "amount": 9.99
        },
        "team": {
          "priceId": "price_yyy",
          "amount": 29.99
        }
      }
    }
  }
}
```

## 🚂 Étape 4 : Déploiement Railway

### 4.1 Orchestra Backend

```bash
# Créer un nouveau projet Railway
railway login
railway init

# Configurer les variables d'environnement
railway variables set NODE_ENV=production
railway variables set PORT=3011
railway variables set SUPABASE_URL="https://xxxxx.supabase.co"
railway variables set SUPABASE_SERVICE_KEY="eyJ..."
railway variables set JWT_SECRET="your-secret-key"
railway variables set GITHUB_CLIENT_ID="Iv1..."
railway variables set GITHUB_CLIENT_SECRET="..."
railway variables set STRIPE_SECRET_KEY="sk_live_..."
railway variables set STRIPE_WEBHOOK_SECRET="whsec_..."
railway variables set STRIPE_PRICE_PRO="price_xxx"
railway variables set STRIPE_PRICE_TEAM="price_yyy"
railway variables set FRONTEND_URL="https://orchestra.vercel.app"
railway variables set SENTRY_DSN="https://xxx@sentry.io/xxx"

# Déployer
cd backend
railway up
```

### 4.2 Clawd Backend

```bash
# Créer un nouveau projet Railway
cd /path/to/clawd-cursor-main/backend
railway init

# Configurer les variables d'environnement
railway variables set NODE_ENV=production
railway variables set PORT=3010
railway variables set SENTRY_DSN="https://yyy@sentry.io/yyy"

# Déployer
railway up
```

## 🔐 Étape 5 : Configuration GitHub OAuth

### 5.1 Créer OAuth App

1. Aller sur https://github.com/settings/developers
2. New OAuth App
3. Application name : Orchestra
4. Homepage URL : https://orchestra.vercel.app
5. Authorization callback URL : https://your-backend.railway.app/api/auth/github/callback

### 5.2 Configurer les tokens

```bash
npm run tokens set github oauth_client_id "Iv1..."
npm run tokens set github oauth_client_secret "..."
```

## 📦 Étape 6 : Génération des .env

```bash
# Development
npm run tokens:dev

# Staging
npm run tokens:staging

# Production
npm run tokens:prod
```

## ✅ Étape 7 : Vérification

### 7.1 Vérifier les tokens

```bash
npm run tokens:status
# Devrait afficher 13/13 tokens configurés (100%)
```

### 7.2 Tester les endpoints

```bash
# Backend health check
curl https://your-backend.railway.app/health

# Supabase connection
curl https://your-backend.railway.app/api/health/db

# Stripe webhook
curl -X POST https://your-backend.railway.app/api/billing/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"test"}'
```

### 7.3 Tester Sentry

```bash
# Déclencher une erreur test
curl https://your-backend.railway.app/api/test/sentry-error

# Vérifier sur https://sentry.io/organizations/adrien-debug/issues/
```

## 🚀 Étape 8 : Déploiement Frontend

### 8.1 Vercel (Landing + Electron)

```bash
# Installer Vercel CLI
npm install -g vercel

# Déployer landing
cd landing
vercel --prod

# Configurer les variables d'environnement
vercel env add NEXT_PUBLIC_API_URL production
# Valeur : https://your-backend.railway.app
```

### 8.2 Electron (Desktop App)

```bash
# Build pour toutes les plateformes
npm run dist:all

# Publier sur GitHub Releases
gh release create v0.1.0 \
  dist/*.dmg \
  dist/*.exe \
  dist/*.AppImage \
  --title "Orchestra v0.1.0" \
  --notes "Initial production release"
```

## 📊 Étape 9 : Monitoring

### 9.1 Sentry Dashboards

- Orchestra : https://sentry.io/organizations/adrien-debug/projects/orchestra/
- Clawd : https://sentry.io/organizations/adrien-debug/projects/clawd/

### 9.2 Railway Dashboards

- Orchestra Backend : https://railway.app/project/orchestra-backend
- Clawd Backend : https://railway.app/project/clawd-backend

### 9.3 Supabase Dashboard

- Database : https://app.supabase.com/project/_/editor
- Auth : https://app.supabase.com/project/_/auth/users
- Storage : https://app.supabase.com/project/_/storage/buckets

## 🔄 Étape 10 : CI/CD

### 10.1 GitHub Actions

Créer `.github/workflows/deploy.yml` :

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: vercel --prod
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

## 📝 Checklist Finale

### Configuration
- [x] Sentry token configuré
- [ ] Sentry projets créés (Orchestra, Clawd)
- [ ] Sentry DSN configurés
- [ ] Supabase projet créé
- [ ] Supabase tokens configurés
- [ ] Supabase tables créées
- [ ] Stripe produits créés
- [ ] Stripe tokens configurés
- [ ] GitHub OAuth app créée
- [ ] GitHub tokens configurés

### Déploiement
- [ ] Backend Orchestra déployé sur Railway
- [ ] Backend Clawd déployé sur Railway
- [ ] Landing déployé sur Vercel
- [ ] Electron app buildée
- [ ] GitHub Release créée

### Vérification
- [ ] Health checks OK
- [ ] Database connection OK
- [ ] Stripe webhook OK
- [ ] Sentry errors tracking OK
- [ ] GitHub OAuth flow OK

### Monitoring
- [ ] Sentry dashboards configurés
- [ ] Railway dashboards configurés
- [ ] Supabase dashboard configuré
- [ ] CI/CD configuré

## 🎉 Post-Déploiement

### 1. Tester en production

```bash
# Tester le flow complet
1. Ouvrir https://orchestra.vercel.app
2. Cliquer "Sign in with GitHub"
3. Autoriser l'application
4. Vérifier le dashboard
5. Tester un paiement Stripe (mode test)
6. Vérifier les erreurs dans Sentry
```

### 2. Monitoring continu

```bash
# Vérifier les logs Railway
railway logs

# Vérifier les erreurs Sentry
open https://sentry.io/organizations/adrien-debug/issues/

# Vérifier les métriques Supabase
open https://app.supabase.com/project/_/reports
```

### 3. Mise à jour

```bash
# Mettre à jour le backend
cd backend
git pull
railway up

# Mettre à jour le frontend
cd landing
git pull
vercel --prod
```

## 🆘 Troubleshooting

### Backend ne démarre pas

```bash
# Vérifier les logs
railway logs

# Vérifier les variables d'environnement
railway variables

# Redéployer
railway up --force
```

### Database connection failed

```bash
# Vérifier les credentials Supabase
npm run tokens show supabase

# Tester la connection
curl https://your-backend.railway.app/api/health/db
```

### Stripe webhook errors

```bash
# Vérifier le webhook secret
npm run tokens show stripe

# Tester le webhook
stripe listen --forward-to localhost:3011/api/billing/webhook
```

---

**Date** : 13 avril 2026  
**Version** : 1.0.0  
**Status** : Ready for deployment 🚀
