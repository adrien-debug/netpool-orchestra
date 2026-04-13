# 🔑 Tokens Configuration System

Système de gestion centralisée des tokens et API keys pour Orchestra.

## 📋 Structure

### `TOKENS-CONFIG.json`

Configuration centralisée de tous tes tokens, API keys et secrets.

```json
{
  "tokens": {
    "service-name": {
      "name": "Service Name",
      "description": "What it does",
      "url": "https://service.com",
      "tokens": {
        "token-id": {
          "name": "Token Name",
          "value": "actual-token-value",
          "envVar": "ENV_VAR_NAME",
          "scope": ["permission1", "permission2"],
          "expiresAt": "2025-12-31",
          "createdAt": "2025-01-01",
          "note": "Optional note"
        }
      }
    }
  },
  "environments": {
    "development": {
      "name": "Development",
      "description": "Local dev",
      "services": ["sentry", "stripe"],
      "envFile": ".env.development"
    }
  }
}
```

## 🚀 Quick Actions

### Lister tous les services et tokens

```bash
npm run tokens:list
```

### Voir le statut de configuration

```bash
npm run tokens:status
```

### Voir un service spécifique

```bash
npm run tokens show sentry
npm run tokens show stripe
```

### Configurer un token

```bash
npm run tokens set sentry auth "sntrys_..."
npm run tokens set stripe secret "sk_test_..."
npm run tokens set openai api_key "sk-..."
```

### Générer les fichiers .env

```bash
# Development
npm run tokens:dev

# Staging
npm run tokens:staging

# Production
npm run tokens:prod
```

### Lister les environnements

```bash
npm run tokens:envs
```

## 🔑 Services Configurés

### Sentry (Error Tracking)
- **Auth Token** : Token d'authentification Sentry
- **DSN** : Data Source Name pour chaque projet
- **Projects** : Orchestra, Clawd

```bash
npm run tokens show sentry
npm run tokens set sentry auth "sntrys_..."
```

### Stripe (Payments)
- **Secret Key** : Clé secrète (sk_test_... ou sk_live_...)
- **Publishable Key** : Clé publique (pk_test_... ou pk_live_...)
- **Webhook Secret** : Secret webhook (whsec_...)
- **Products** : Pro Plan, Team Plan

```bash
npm run tokens show stripe
npm run tokens set stripe secret "sk_test_..."
npm run tokens set stripe publishable "pk_test_..."
```

### Supabase (Backend)
- **Project URL** : URL du projet Supabase
- **Anon Key** : Clé publique client-side
- **Service Role Key** : Clé secrète server-side (bypasse RLS)

```bash
npm run tokens show supabase
npm run tokens set supabase url "https://xxxxx.supabase.co"
npm run tokens set supabase anon "eyJ..."
npm run tokens set supabase service "eyJ..."
```

### GitHub (OAuth)
- **OAuth Client ID** : ID client OAuth
- **OAuth Client Secret** : Secret client OAuth
- **Personal Access Token** : Token personnel (ghp_...)

```bash
npm run tokens show github
npm run tokens set github oauth_client_id "Iv1..."
npm run tokens set github oauth_client_secret "..."
```

### OpenAI (AI)
- **API Key** : Clé API OpenAI (sk-...)
- **Models** : GPT-4, GPT-3.5

```bash
npm run tokens show openai
npm run tokens set openai api_key "sk-..."
```

### Anthropic (Claude)
- **API Key** : Clé API Anthropic (sk-ant-...)
- **Models** : Claude 3, Claude 2

```bash
npm run tokens show anthropic
npm run tokens set anthropic api_key "sk-ant-..."
```

## 🌍 Environnements

### Development
Services : Sentry, Stripe, Supabase, GitHub, OpenAI, Anthropic  
Fichier : `.env.development`

```bash
npm run tokens:dev
```

### Staging
Services : Sentry, Stripe, Supabase, GitHub  
Fichier : `.env.staging`

```bash
npm run tokens:staging
```

### Production
Services : Sentry, Stripe, Supabase, GitHub  
Fichier : `.env.production`

```bash
npm run tokens:prod
```

## 🔧 Configuration

### Ajouter un nouveau service

1. Édite `config/TOKENS-CONFIG.json`
2. Ajoute ton service :

```json
{
  "tokens": {
    "my-service": {
      "name": "My Service",
      "description": "What it does",
      "url": "https://my-service.com",
      "tokens": {
        "api_key": {
          "name": "API Key",
          "value": "",
          "envVar": "MY_SERVICE_API_KEY",
          "scope": ["read", "write"],
          "expiresAt": null,
          "createdAt": null
        }
      }
    }
  }
}
```

3. Configure le token :

```bash
npm run tokens set my-service api_key "your-token"
```

### Ajouter un token à un service existant

1. Édite `config/TOKENS-CONFIG.json`
2. Ajoute le token dans la section `tokens` du service
3. Configure-le avec `npm run tokens set`

### Créer un nouvel environnement

1. Édite `config/TOKENS-CONFIG.json`
2. Ajoute l'environnement :

```json
{
  "environments": {
    "my-env": {
      "name": "My Environment",
      "description": "Custom environment",
      "services": ["sentry", "stripe"],
      "envFile": ".env.my-env"
    }
  }
}
```

3. Génère le fichier :

```bash
npm run tokens env my-env
```

## 💡 Utilisation Programmatique

### Lire la configuration

```typescript
import tokensConfig from './config/TOKENS-CONFIG.json';

// Lister tous les services
Object.entries(tokensConfig.tokens).forEach(([serviceId, service]) => {
  console.log(`Service: ${service.name}`);
  Object.entries(service.tokens).forEach(([tokenId, token]) => {
    console.log(`  - ${token.name}: ${token.envVar}`);
  });
});
```

### Accéder à un token

```typescript
const sentryToken = tokensConfig.tokens.sentry.tokens.auth.value;
const stripeKey = tokensConfig.tokens.stripe.tokens.secret.value;
```

### Générer .env programmatiquement

```typescript
import { writeFileSync } from 'fs';

const env = tokensConfig.environments.development;
const lines: string[] = [];

env.services.forEach(serviceId => {
  const service = tokensConfig.tokens[serviceId];
  Object.entries(service.tokens).forEach(([tokenId, token]) => {
    if (token.value) {
      lines.push(`${token.envVar}=${token.value}`);
    }
  });
});

writeFileSync('.env', lines.join('\n'));
```

## 🔒 Sécurité

### Bonnes Pratiques

✅ **Ne jamais commiter** `TOKENS-CONFIG.json` avec des vraies valeurs  
✅ **Utiliser** `.env` files (déjà dans `.gitignore`)  
✅ **Masquer** les tokens dans les logs (fait automatiquement)  
✅ **Rotation** régulière des tokens  
✅ **Expiration** : configurer `expiresAt` pour tracking  

### Fichiers à ignorer

Ajoute dans `.gitignore` :

```gitignore
# Tokens configuration (contains secrets)
config/TOKENS-CONFIG.json

# Environment files
.env
.env.development
.env.staging
.env.production
.env.local
.env.*.local
```

### Template pour partage

Crée `TOKENS-CONFIG.template.json` :

```json
{
  "version": "1.0.0",
  "tokens": {
    "sentry": {
      "name": "Sentry",
      "description": "Error tracking",
      "url": "https://sentry.io",
      "tokens": {
        "auth": {
          "name": "Auth Token",
          "value": "",
          "envVar": "SENTRY_AUTH_TOKEN",
          "scope": ["project:read", "project:write"],
          "note": "Get from https://sentry.io/settings/account/api/auth-tokens/"
        }
      }
    }
  }
}
```

## 📊 Commandes Utiles

### Workflow quotidien

```bash
# Vérifier le statut
npm run tokens:status

# Voir un service
npm run tokens show sentry

# Configurer un token
npm run tokens set sentry auth "sntrys_..."

# Générer .env development
npm run tokens:dev

# Lister tous les tokens
npm run tokens:list
```

### Setup nouveau projet

```bash
# 1. Copier le template
cp config/TOKENS-CONFIG.template.json config/TOKENS-CONFIG.json

# 2. Configurer les tokens
npm run tokens set sentry auth "..."
npm run tokens set stripe secret "..."
npm run tokens set supabase url "..."

# 3. Générer .env
npm run tokens:dev

# 4. Vérifier
npm run tokens:status
```

### Rotation des tokens

```bash
# 1. Voir le token actuel
npm run tokens show sentry

# 2. Mettre à jour
npm run tokens set sentry auth "new-token"

# 3. Régénérer .env
npm run tokens:dev

# 4. Vérifier
npm run tokens:status
```

## 🎯 Intégration Orchestra

Le système de tokens est automatiquement intégré dans Orchestra :

1. **Auto-load** : Orchestra lit `TOKENS-CONFIG.json` au démarrage
2. **UI Settings** : Configure les tokens depuis l'interface
3. **Validation** : Vérifie les tokens requis
4. **Masking** : Masque automatiquement dans les logs

## 🔍 Troubleshooting

### Token invalide

```bash
# Vérifier le token
npm run tokens show sentry

# Tester le token
curl -H "Authorization: Bearer sntrys_..." https://sentry.io/api/0/
```

### .env non généré

```bash
# Vérifier les permissions
ls -la .env*

# Régénérer
npm run tokens:dev
```

### Service non trouvé

```bash
# Lister les services disponibles
npm run tokens:list

# Vérifier l'ID exact
npm run tokens show <service-id>
```

## 📚 Exemples

### Setup complet Sentry

```bash
# 1. Voir la config Sentry
npm run tokens show sentry

# 2. Configurer le token auth
npm run tokens set sentry auth "sntrys_eyJpYXQiOjE3NzYwNDc0MjAuNjM2MjU1..."

# 3. Créer les projets sur Sentry
# - Orchestra: https://sentry.io/organizations/adrien-debug/projects/orchestra/
# - Clawd: https://sentry.io/organizations/adrien-debug/projects/clawd/

# 4. Configurer les DSN
npm run tokens set sentry dsn "https://xxx@sentry.io/xxx"

# 5. Générer .env
npm run tokens:dev
```

### Setup complet Stripe

```bash
# 1. Voir la config Stripe
npm run tokens show stripe

# 2. Configurer les clés test
npm run tokens set stripe secret "sk_test_..."
npm run tokens set stripe publishable "pk_test_..."
npm run tokens set stripe webhook "whsec_..."

# 3. Générer .env
npm run tokens:dev

# 4. Tester
curl https://api.stripe.com/v1/customers -u sk_test_...:
```

## 🎉 Avantages

✅ **Centralisé** : Une seule source de vérité  
✅ **Typé** : Schema JSON pour validation  
✅ **Sécurisé** : Masking automatique  
✅ **Flexible** : Environnements multiples  
✅ **Scriptable** : Utilisation programmatique  
✅ **Documenté** : Configuration auto-documentée  
✅ **Intégré** : Fonctionne avec Orchestra  

---

**Créé par** : Orchestra Team  
**Version** : 1.0.0  
**Date** : 13 avril 2026
