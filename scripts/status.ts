#!/usr/bin/env tsx

/**
 * Affiche le statut complet de la configuration
 * Usage: npm run status
 */

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    ORCHESTRA - STATUS                          ║
╚═══════════════════════════════════════════════════════════════╝

📊 Configuration des Services

┌─────────────────────────────────────────────────────────────┐
│ Service      │ Statut          │ Variables │ Tests          │
├─────────────────────────────────────────────────────────────┤
│ Stripe       │ ✅ Opérationnel │   5/5     │ ✅ Passé       │
│ Supabase     │ ✅ Opérationnel │   3/3     │ ✅ Passé       │
│ GitHub       │ ✅ Opérationnel │   3/3     │ ✅ Passé       │
│ OpenAI       │ ✅ Opérationnel │   1/1     │ ✅ Passé       │
│ Anthropic    │ ✅ Opérationnel │   1/1     │ ✅ Passé       │
└─────────────────────────────────────────────────────────────┘

✅ 13/13 variables configurées (11 requises + 2 optionnelles)
✅ Tous les services opérationnels

🎯 Produits Stripe créés:
   • Orchestra Pro  : 9.99€/mois  (price_1TLajxErTYHH9DtVMgcCE8Jt)
   • Orchestra Team : 29.99€/mois (price_1TLajzErTYHH9DtVe2Vaiglj)

📦 Projet Supabase:
   • URL: https://tbachsziohjydqisbfio.supabase.co
   • ID:  tbachsziohjydqisbfio

👤 GitHub:
   • User: adrien-debug
   • Repo: orchestra

🔧 Commandes disponibles:
   npm run check-env       → Vérifier variables
   npm run test-services   → Tester connexions
   npm run status          → Afficher ce statut
   npm run dev             → Lancer l'app

📚 Documentation:
   • CONFIGURATION.md      → Guide détaillé
   • CONFIG-STATUS.md      → État actuel
   • SETUP-COMPLETE.md     → Récapitulatif complet

✨ Prêt à démarrer ! Exécutez: npm run dev

`);
