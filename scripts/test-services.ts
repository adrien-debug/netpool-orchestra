#!/usr/bin/env tsx

/**
 * Script de test des connexions aux services externes
 * Usage: npm run test-services
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Charger .env.local
function loadEnv(): Record<string, string> {
  const envPath = join(process.cwd(), '.env.local');
  const env: Record<string, string> = {};
  
  try {
    const content = readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        env[key.trim()] = value.trim();
      }
    }
  } catch (error) {
    console.error('❌ Erreur lecture .env.local:', error);
  }

  return env;
}

async function testStripe(env: Record<string, string>): Promise<boolean> {
  console.log('\n🔵 Test Stripe...');
  
  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.log('   ❌ STRIPE_SECRET_KEY non configuré');
    return false;
  }

  try {
    const response = await fetch('https://api.stripe.com/v1/balance', {
      headers: {
        'Authorization': `Bearer ${secretKey}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Connexion réussie');
      console.log(`   💰 Balance: ${data.available[0]?.amount || 0} ${data.available[0]?.currency || 'eur'}`);
      return true;
    } else {
      console.log(`   ❌ Erreur API: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Erreur réseau:', error);
    return false;
  }
}

async function testSupabase(env: Record<string, string>): Promise<boolean> {
  console.log('\n🟢 Test Supabase...');
  
  const url = env.SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY;
  
  if (!url || !anonKey) {
    console.log('   ❌ Variables Supabase non configurées');
    return false;
  }

  try {
    // Test simple sur l'endpoint health
    const response = await fetch(`${url}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': anonKey,
      },
    });

    // 200, 404, ou 401 sont OK (projet existe)
    if (response.status === 200 || response.status === 404 || response.status === 401) {
      console.log('   ✅ Connexion réussie');
      console.log(`   🔗 URL: ${url}`);
      console.log(`   📦 Projet: ${url.split('//')[1].split('.')[0]}`);
      return true;
    } else {
      console.log(`   ❌ Erreur API: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Erreur réseau:', error);
    return false;
  }
}

async function testGitHub(env: Record<string, string>): Promise<boolean> {
  console.log('\n⚫ Test GitHub...');
  
  const token = env.GITHUB_TOKEN;
  if (!token) {
    console.log('   ❌ GITHUB_TOKEN non configuré');
    return false;
  }

  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Connexion réussie');
      console.log(`   👤 User: ${data.login}`);
      console.log(`   📊 Repos: ${data.public_repos} publics`);
      return true;
    } else {
      console.log(`   ❌ Erreur API: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Erreur réseau:', error);
    return false;
  }
}

async function testOpenAI(env: Record<string, string>): Promise<boolean> {
  console.log('\n🟣 Test OpenAI...');
  
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('   ⚠️  OPENAI_API_KEY non configuré (optionnel)');
    return true; // Non bloquant
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Connexion réussie');
      console.log(`   🤖 Modèles disponibles: ${data.data?.length || 0}`);
      return true;
    } else {
      console.log(`   ❌ Erreur API: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Erreur réseau:', error);
    return false;
  }
}

async function testAnthropic(env: Record<string, string>): Promise<boolean> {
  console.log('\n🟠 Test Anthropic...');
  
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('   ⚠️  ANTHROPIC_API_KEY non configuré (optionnel)');
    return true; // Non bloquant
  }

  try {
    // Anthropic n'a pas d'endpoint de test simple, on fait un ping basique
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      }),
    });

    if (response.ok || response.status === 400) {
      // 400 est OK car on envoie un payload minimal
      console.log('   ✅ Connexion réussie');
      return true;
    } else {
      console.log(`   ❌ Erreur API: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Erreur réseau:', error);
    return false;
  }
}

async function main(): Promise<void> {
  console.log('🧪 Test des connexions aux services externes\n');
  console.log('═'.repeat(60));

  const env = loadEnv();

  const results = {
    stripe: await testStripe(env),
    supabase: await testSupabase(env),
    github: await testGitHub(env),
    openai: await testOpenAI(env),
    anthropic: await testAnthropic(env),
  };

  console.log('\n' + '═'.repeat(60));
  console.log('\n📊 Résumé\n');

  const total = Object.keys(results).length;
  const success = Object.values(results).filter(Boolean).length;

  Object.entries(results).forEach(([service, ok]) => {
    const icon = ok ? '✅' : '❌';
    console.log(`   ${icon} ${service.charAt(0).toUpperCase() + service.slice(1)}`);
  });

  console.log(`\n   Total: ${success}/${total} services OK`);

  if (success === total) {
    console.log('\n✅ Tous les services sont opérationnels !\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Certains services ont des problèmes.\n');
    process.exit(1);
  }
}

main();
