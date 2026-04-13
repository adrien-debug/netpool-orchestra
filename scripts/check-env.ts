#!/usr/bin/env tsx

/**
 * Script de vérification des variables d'environnement
 * Usage: npm run check-env
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface EnvCheck {
  name: string;
  required: string[];
  optional: string[];
  file: string;
}

const checks: EnvCheck[] = [
  {
    name: 'Electron App',
    file: '.env.local',
    required: [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
    ],
    optional: [
      'STRIPE_PUBLISHABLE_KEY',
      'GITHUB_TOKEN',
      'GITHUB_OWNER',
      'GITHUB_REPO',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
    ],
  },
  {
    name: 'Backend API',
    file: 'backend/.env',
    required: [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_KEY',
      'JWT_SECRET',
      'STRIPE_SECRET_KEY',
    ],
    optional: [
      'STRIPE_WEBHOOK_SECRET',
      'STRIPE_PRICE_PRO',
      'STRIPE_PRICE_TEAM',
      'GITHUB_CLIENT_ID',
      'GITHUB_CLIENT_SECRET',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
    ],
  },
];

function parseEnvFile(filepath: string): Record<string, string> {
  const env: Record<string, string> = {};
  
  if (!existsSync(filepath)) {
    return env;
  }

  const content = readFileSync(filepath, 'utf-8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Ignorer les commentaires et lignes vides
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      env[key.trim()] = value.trim();
    }
  }

  return env;
}

function checkEnv(check: EnvCheck): void {
  console.log(`\n📦 ${check.name}`);
  console.log(`   Fichier: ${check.file}`);

  const filepath = join(process.cwd(), check.file);
  
  if (!existsSync(filepath)) {
    console.log(`   ❌ Fichier manquant`);
    console.log(`   → Créer depuis: ${check.file.replace(/\.env.*/, '.env.example')}`);
    return;
  }

  const env = parseEnvFile(filepath);
  
  // Variables requises
  let requiredOk = 0;
  let requiredMissing = 0;

  console.log(`\n   Variables requises (${check.required.length}):`);
  for (const key of check.required) {
    const value = env[key];
    const isEmpty = !value || value === '';
    
    if (isEmpty) {
      console.log(`   ❌ ${key}`);
      requiredMissing++;
    } else {
      console.log(`   ✅ ${key}`);
      requiredOk++;
    }
  }

  // Variables optionnelles
  let optionalOk = 0;
  let optionalMissing = 0;

  if (check.optional.length > 0) {
    console.log(`\n   Variables optionnelles (${check.optional.length}):`);
    for (const key of check.optional) {
      const value = env[key];
      const isEmpty = !value || value === '';
      
      if (isEmpty) {
        console.log(`   ⚠️  ${key}`);
        optionalMissing++;
      } else {
        console.log(`   ✅ ${key}`);
        optionalOk++;
      }
    }
  }

  // Résumé
  console.log(`\n   Résumé:`);
  console.log(`   - Requises: ${requiredOk}/${check.required.length}`);
  console.log(`   - Optionnelles: ${optionalOk}/${check.optional.length}`);
  
  if (requiredMissing > 0) {
    console.log(`   ⚠️  ${requiredMissing} variable(s) requise(s) manquante(s)`);
  } else {
    console.log(`   ✅ Toutes les variables requises sont configurées`);
  }
}

function main(): void {
  console.log('🔍 Vérification des variables d\'environnement\n');
  console.log('═'.repeat(60));

  for (const check of checks) {
    checkEnv(check);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('\n📚 Documentation: CONFIGURATION.md');
  console.log('🔧 Aide: npm run check-env\n');
}

main();
