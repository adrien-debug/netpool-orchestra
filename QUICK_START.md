# ⚡ Quick Start — Orchestra

Guide de démarrage rapide pour Orchestra.

---

## 🚀 Installation

```bash
# Cloner le repo
git clone https://github.com/adrien-debug/netpool-orchestra.git
cd netpool-orchestra

# Installer les dépendances
npm install
```

---

## ⚙️ Configuration

### 1. Setup initial

```bash
# Copier le template de tokens
cp config/TOKENS-CONFIG.example.json config/TOKENS-CONFIG.json

# Note: TOKENS-CONFIG.json est git-ignored pour la sécurité
```

### 2. Vérifier le statut

```bash
npm run tokens:status
```

### 3. Configurer les tokens

```bash
# Sentry
npm run tokens set sentry auth "sntrys_..."
npm run tokens set sentry dsn "https://xxx@sentry.io/xxx"

# Supabase
npm run tokens set supabase url "https://xxxxx.supabase.co"
npm run tokens set supabase anon "eyJ..."
npm run tokens set supabase service "eyJ..."

# Stripe
npm run tokens set stripe secret "sk_test_..."
npm run tokens set stripe publishable "pk_test_..."
npm run tokens set stripe webhook "whsec_..."

# GitHub
npm run tokens set github oauth_client_id "Iv1..."
npm run tokens set github oauth_client_secret "..."

# AI
npm run tokens set openai api_key "sk-..."
npm run tokens set anthropic api_key "sk-ant-..."
```

### 4. Générer .env

```bash
# Development
npm run tokens:dev

# Staging
npm run tokens:staging

# Production
npm run tokens:prod
```

---

## 🏃 Développement

### Démarrer tous les services

```bash
npm run ports:full
```

### Démarrer des profils spécifiques

```bash
# Clawd uniquement
npm run ports:clawd

# Orchestra uniquement
npm run ports:orchestra

# Services critiques uniquement
npm run ports:minimal
```

### Démarrer un service spécifique

```bash
npm run ports start clawd-backend
npm run ports start orchestra-electron
```

---

## 🧪 Tests

```bash
# Tous les tests
npm test

# Tests backend
npm test --prefix backend

# TypeScript
npm run typecheck

# Build
npm run build
```

---

## 📦 Build Electron

```bash
# Build pour la plateforme actuelle
npm run dist

# Build pour toutes les plateformes
npm run dist:all

# Build spécifique
npm run dist:mac
npm run dist:win
npm run dist:linux
```

---

## 🚀 Déploiement

### Automatique

```bash
# Development
npm run deploy:dev

# Staging
npm run deploy:staging

# Production
npm run deploy:prod
```

### Manuel

```bash
# 1. Générer .env production
npm run tokens:prod

# 2. Setup Railway
./scripts/setup-railway.sh

# 3. Déployer backend
cd backend
railway up

# 4. Déployer frontend
cd ../landing
vercel --prod
```

---

## 📊 Monitoring

### Vérifier les services

```bash
# Lister tous les services
npm run ports:list

# Lister tous les profils
npm run ports:profiles

# Statut des tokens
npm run tokens:status
```

### Health checks

```bash
# Backend local
curl http://localhost:3011/health

# Backend production
curl https://orchestra-backend.railway.app/health

# Frontend production
curl https://orchestra.vercel.app
```

---

## 🔧 Utilitaires

### Ports

```bash
npm run ports:list         # Lister services
npm run ports:profiles     # Lister profils
npm run ports start <id>   # Démarrer service
npm run ports:full         # Démarrer tous
npm run ports:clawd        # Profil Clawd
npm run ports:orchestra    # Profil Orchestra
npm run ports:minimal      # Profil minimal
```

### Tokens

```bash
npm run tokens:list                        # Lister tokens
npm run tokens:status                      # Statut config
npm run tokens show <service>              # Détails service
npm run tokens set <service> <token> "<value>"  # Configurer
npm run tokens:dev                         # .env.development
npm run tokens:staging                     # .env.staging
npm run tokens:prod                        # .env.production
```

---

## 📚 Documentation

### Guides Principaux
- `README.md` — Vue d'ensemble
- `DEPLOYMENT.md` — Guide de déploiement
- `DEPLOY-CHECKLIST.md` — Checklist
- `MISSION_FINALE.md` — Résumé complet

### Guides Spécifiques
- `PORTS-CONFIG.README.md` — Système de ports
- `TOKENS-CONFIG.README.md` — Système de tokens

---

## 🆘 Troubleshooting

### Tokens manquants

```bash
npm run tokens:status
npm run tokens set <service> <token> "<value>"
```

### Services ne démarrent pas

```bash
npm run ports:list
# Vérifier les ports disponibles

# Tuer les processus sur un port
lsof -ti:3011 | xargs kill -9
```

### Tests échouent

```bash
npm test -- --reporter=verbose
```

### Build échoue

```bash
npm run typecheck
# Corriger les erreurs TypeScript

npm run build
```

### Railway deployment failed

```bash
railway logs
railway variables
railway up --force
```

---

## 🎯 Commandes Essentielles

```bash
# Configuration
npm run tokens:status          # Vérifier config
npm run tokens:dev             # Générer .env

# Développement
npm run ports:full             # Démarrer tout
npm run dev                    # Dev mode

# Tests
npm test                       # Tests
npm run typecheck              # TypeScript

# Build
npm run build                  # Build web
npm run dist                   # Build Electron

# Déploiement
npm run deploy:prod            # Deploy prod
```

---

## 📞 Support

**Documentation** :
- Voir `DEPLOYMENT.md` pour le guide complet
- Voir `DEPLOY-CHECKLIST.md` pour la checklist
- Voir `README.md` pour l'architecture

**GitHub** :
- Issues : https://github.com/adrien-debug/netpool-orchestra/issues
- Discussions : https://github.com/adrien-debug/netpool-orchestra/discussions

---

**Date** : 13 avril 2026  
**Version** : 1.0.0  
**Status** : Production-ready 🚀
