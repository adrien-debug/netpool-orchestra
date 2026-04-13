# 🎵 Ports Configuration System

Système de gestion centralisée des ports et services pour Orchestra.

## 📋 Structure

### `PORTS-CONFIG.json`

Configuration centralisée de tous tes services et leurs ports.

```json
{
  "ports": {
    "project-name": {
      "service-name": {
        "name": "Display Name",
        "port": 3000,
        "path": "/absolute/path/to/service",
        "command": "npm run dev",
        "healthCheck": "http://localhost:3000/health",
        "env": { "NODE_ENV": "development" },
        "dependencies": ["other-service"],
        "optional": false
      }
    }
  },
  "profiles": {
    "profile-name": {
      "name": "Profile Display Name",
      "description": "What this profile does",
      "services": ["project.service", "project.other-service"]
    }
  }
}
```

## 🚀 Quick Actions

### Lister les services disponibles

```bash
npm run ports:list
```

Affiche tous les services configurés avec leurs ports.

### Lister les profils

```bash
npm run ports:profiles
```

Affiche tous les profils de démarrage disponibles.

### Démarrer un service spécifique

```bash
npm run ports start clawd-cursor-main.backend
npm run ports start orchestra.electron
```

### Démarrer un profil complet

```bash
# Tous les services
npm run ports:full

# Uniquement Clawd
npm run ports:clawd

# Uniquement Orchestra
npm run ports:orchestra

# Services critiques uniquement
npm run ports:minimal
```

## 📦 Profils Disponibles

### `full` - Full Stack
Démarre tous les services (clawd + orchestra + landing).

Services :
- Clawd Backend (:3010)
- Clawd Frontend (:3000)
- Orchestra Backend (:3011)
- Orchestra Electron (:3322)
- Landing Page (:3001)

```bash
npm run ports:full
```

### `clawd-only` - Clawd Only
Uniquement Clawd (backend + frontend).

Services :
- Clawd Backend (:3010)
- Clawd Frontend (:3000)

```bash
npm run ports:clawd
```

### `orchestra-only` - Orchestra Only
Uniquement Orchestra (backend + electron).

Services :
- Orchestra Backend (:3011)
- Orchestra Electron (:3322)

```bash
npm run ports:orchestra
```

### `minimal` - Minimal
Services critiques uniquement (backends).

Services :
- Clawd Backend (:3010)
- Orchestra Backend (:3011)

```bash
npm run ports:minimal
```

## 🔧 Configuration

### Ajouter un nouveau service

1. Édite `config/PORTS-CONFIG.json`
2. Ajoute ton service dans la section `ports` :

```json
{
  "ports": {
    "my-project": {
      "my-service": {
        "name": "My Service",
        "port": 4000,
        "path": "/path/to/my-service",
        "command": "npm start",
        "healthCheck": "http://localhost:4000/health",
        "env": {
          "NODE_ENV": "development",
          "PORT": "4000"
        },
        "dependencies": [],
        "optional": false
      }
    }
  }
}
```

### Créer un nouveau profil

1. Édite `config/PORTS-CONFIG.json`
2. Ajoute ton profil dans la section `profiles` :

```json
{
  "profiles": {
    "my-profile": {
      "name": "My Profile",
      "description": "Custom profile for my workflow",
      "services": [
        "my-project.my-service",
        "clawd-cursor-main.backend"
      ]
    }
  }
}
```

3. Ajoute un script npm dans `package.json` :

```json
{
  "scripts": {
    "ports:my-profile": "tsx scripts/ports-manager.ts profile my-profile"
  }
}
```

## 💡 Utilisation Programmatique

### Lire la configuration

```typescript
import portsConfig from './config/PORTS-CONFIG.json';

// Lister tous les services
Object.entries(portsConfig.ports).forEach(([project, services]) => {
  console.log(`Projet: ${project}`);
  Object.entries(services).forEach(([service, config]) => {
    console.log(`  - ${config.name}: ${config.port}`);
  });
});
```

### Démarrer un service

```typescript
import { execa } from 'execa';
import portsConfig from './config/PORTS-CONFIG.json';

const service = portsConfig.ports['clawd-cursor-main'].backend;

const subprocess = execa('bash', ['-lc', service.command], {
  cwd: service.path,
  env: { ...process.env, ...service.env },
  stdio: 'inherit'
});

await subprocess;
```

### Vérifier les dépendances

```typescript
function getServiceDependencies(serviceId: string): string[] {
  const [project, service] = serviceId.split('.');
  const config = portsConfig.ports[project]?.[service];
  return config?.dependencies ?? [];
}

// Démarrer les dépendances en premier
const deps = getServiceDependencies('clawd-cursor-main.frontend');
for (const dep of deps) {
  await startService(dep);
}
```

## 🎯 Intégration Orchestra

Le système de ports est automatiquement intégré dans Orchestra :

1. **Auto-détection** : Orchestra lit `PORTS-CONFIG.json` au démarrage
2. **Services gérés** : Les services configurés apparaissent dans l'UI
3. **Actions rapides** : Démarrer/arrêter depuis l'interface
4. **Health checks** : Monitoring automatique des services

## 📊 Schema Validation

Le fichier `ports-config.schema.json` valide la structure de ta configuration.

Utilise-le dans ton éditeur pour l'autocomplétion :

```json
{
  "$schema": "./ports-config.schema.json",
  "version": "1.0.0",
  "ports": { ... }
}
```

## 🔍 Troubleshooting

### Service ne démarre pas

1. Vérifie le chemin (`path`) est correct et absolu
2. Vérifie la commande (`command`) fonctionne manuellement
3. Vérifie les variables d'environnement (`env`)
4. Vérifie les dépendances sont démarrées

### Port déjà utilisé

```bash
# Libérer un port
lsof -ti tcp:3000 | xargs kill -9

# Ou utilise Orchestra
npm run devctl free-port 3000
```

### Profil ne démarre pas tous les services

1. Vérifie les IDs de services dans le profil
2. Format : `project-name.service-name`
3. Vérifie les services existent dans `ports`

## 📚 Exemples

### Workflow quotidien

```bash
# Matin : démarrer tout
npm run ports:full

# Travailler uniquement sur Clawd
npm run ports:clawd

# Tester Orchestra
npm run ports:orchestra

# Minimal pour économiser RAM
npm run ports:minimal
```

### Debug un service

```bash
# Démarrer uniquement le service problématique
npm run ports start clawd-cursor-main.backend

# Vérifier les logs dans le terminal
```

### Ajouter un nouveau projet

```bash
# 1. Éditer PORTS-CONFIG.json
code config/PORTS-CONFIG.json

# 2. Ajouter le projet et ses services

# 3. Tester
npm run ports:list
npm run ports start my-project.my-service
```

## 🎉 Avantages

✅ **Centralisé** : Une seule source de vérité pour tous les ports  
✅ **Typé** : Schema JSON pour validation  
✅ **Flexible** : Profils pour différents workflows  
✅ **Intégré** : Fonctionne avec Orchestra  
✅ **Scriptable** : Utilisation programmatique facile  
✅ **Documenté** : Configuration auto-documentée  

---

**Créé par** : Orchestra Team  
**Version** : 1.0.0  
**Date** : 13 avril 2026
