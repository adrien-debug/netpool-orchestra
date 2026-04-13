# Orchestra

Desktop orchestrator for local dev stacks — Electron + React + TypeScript.

## Features

### Core
- Live process, port, CPU, RAM and Docker visibility
- Duplicate detection for declared services
- One-click actions: start/stop/restart, clean duplicates, free port, recovery
- Global launcher (`Cmd/Ctrl + Shift + Space`)
- YAML registry for services and profiles
- CLI `devctl` mapped to the same runtime engine
- Smart polling (pauses when app is in background to save CPU/battery)

### Intelligent Agents
- **Advisor Agent** — conversational AI assistant with tool-use (context-aware actions)
- **Preventive Agent** — trend analysis (RAM/CPU), crash-loop detection, proactive alerts
- **Auto-Fix Agent** — rule-based automated fixes with circuit breaker and suggest/auto modes
- **Performance Agent** — health scoring (A-F grade), top consumers, actionable recommendations
- **Onboarding Agent** — machine scan, auto-generates `services.yaml`
- Agent error recovery: agents auto-retry after transient failures (up to 5 attempts with backoff)

### AI Layer
- Multi-provider: OpenAI, Anthropic, Ollama (local)
- Streaming chat panel with inline action buttons and active provider indicator
- Secure API key storage via OS keychain (`safeStorage`)

### Platform
- macOS, Windows, Linux packaging (dmg/nsis/AppImage)
- System tray icon with dynamic menu
- Native notifications for critical alerts
- Auto-update with license gate
- SaaS backend (Railway + Supabase): auth, billing (Stripe with webhook signature verification), config sync, telemetry
- Landing page (Next.js on Vercel)
- Rate limiting on all API endpoints

## Quick Start

```bash
npm install
npm run dev
```

## Build & Package

```bash
npm run dist          # current platform
npm run dist:mac      # macOS (dmg + zip)
npm run dist:win      # Windows (nsis + portable)
npm run dist:linux    # Linux (AppImage + deb)
npm run dist:all      # all platforms
```

## CLI (`devctl`)

```bash
npm run devctl -- doctor
npm run devctl -- clean
npm run devctl -- clean-zombies
npm run devctl -- free-port 3010
npm run devctl -- restart github-mcp
npm run devctl -- profile focus
npm run devctl -- recovery
```

## Tests

```bash
npm test              # run once
npm run test:watch    # watch mode
```

10 test suites, 109 tests covering: config parsing, process utils, ports, logger, metrics history, event bus, action queue, health checks, base agent (error recovery), AI router (fallback chain).

## Config

- `config/services.yaml` — services, process match patterns, start/stop commands, max instances
- `config/profiles.yaml` — startup/shutdown profiles
- `config/ports.yaml` — port registry (project-to-port mapping)

Update paths and commands to match your machine before using destructive actions.

## Backend

Copy `backend/.env.example` to `backend/.env` and fill in your credentials:

```bash
cp backend/.env.example backend/.env
```

Required env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM`, `FRONTEND_URL`.

## Architecture

```
electron/
  main.ts              — Electron main process
  runtime.ts           — orchestrator (scan, actions, profiles, recovery)
  preload.cts          — IPC bridge (contextIsolation)
  updater.ts           — auto-update + license gate
  lib/
    config.ts          — Zod schemas, YAML reading
    logger.ts          — centralized logging
    process-utils.ts   — process matching/killing
    ports.ts           — port listing (lsof)
    docker.ts          — Docker container listing
    health.ts          — service health checks
    metrics-history.ts — sliding window metrics + log persistence
    platform.ts        — cross-platform utilities
  agents/
    event-bus.ts       — pub/sub event bus
    base-agent.ts      — abstract agent class (with error recovery)
    agent-runtime.ts   — agent lifecycle manager
    advisor-agent.ts
    onboarding-agent.ts
    preventive-agent.ts
    autofix-agent.ts
    performance-agent.ts
  ai/
    provider.ts        — AIProvider interface
    router.ts          — multi-provider routing with fallback
    key-store.ts       — secure key storage
    openai.ts / anthropic.ts / ollama.ts
  action-queue.ts      — mutex-based action serialization

src/                   — React renderer (Vite)
  core/store.ts        — Zustand store
  shared/types.ts      — shared type definitions
  shared/commands.ts   — command palette actions
  ui/AppShell.tsx      — layout shell (sidebar, topbar, tray)
  ui/ChatPanel.tsx     — AI chat panel (with provider badge)
  ui/components.tsx    — barrel re-exports
  ui/components/       — split UI components (Section, MetricCard, AlertCard, ServiceRow, PortRow, DockerRow, LogRow, CommandPalette, feedback)
  ui/pages/            — Overview, Services, Incidents, Ports, Docker, Logs, Launcher, Settings (AI config), HowItWorks

backend/               — Express 5 + Supabase API (Railway)
  src/index.ts         — Express server (rate limiting, error handler)
  src/supabase.ts      — Supabase client
  src/routes/          — auth, billing (Stripe webhook verified), license, config-sync, telemetry, updates
  Dockerfile           — Railway deployment
  schema.sql           — database schema

landing/               — Next.js landing page (Vercel)
  src/app/             — App Router pages
  src/components/      — Hero, Features, Agents, Pricing, Download, Footer
```

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Configure tokens
npm run tokens:status
npm run tokens set sentry auth "sntrys_..."
npm run tokens set supabase url "https://xxxxx.supabase.co"
# ... configure other tokens

# Generate .env files
npm run tokens:dev

# Start all services
npm run ports:full

# Or start specific profile
npm run ports:clawd        # Clawd only
npm run ports:orchestra    # Orchestra only
npm run ports:minimal      # Critical services only
```

### Configuration Management

**Setup** (première utilisation) :
```bash
# Copier le template de tokens
cp config/TOKENS-CONFIG.example.json config/TOKENS-CONFIG.json

# Note: TOKENS-CONFIG.json est git-ignored pour la sécurité
```

**Ports** : `config/PORTS-CONFIG.json`
```bash
npm run ports:list         # List all services
npm run ports:profiles     # List all profiles
npm run ports start <id>   # Start specific service
```

**Tokens** : `config/TOKENS-CONFIG.json` (local, git-ignored)
```bash
npm run tokens:list        # List all tokens
npm run tokens:status      # Show configuration status
npm run tokens show <service>  # Show service details
npm run tokens set <service> <token> "<value>"  # Configure token
```

## Deployment

### Prerequisites

- Sentry account (error tracking)
- Supabase account (database)
- Railway account (backend hosting)
- Vercel account (frontend hosting)
- Stripe account (payments)
- GitHub OAuth app

### Quick Deploy

```bash
# Configure all tokens (see DEPLOY-CHECKLIST.md)
npm run tokens:status  # Should show 13/13 tokens configured

# Generate production .env
npm run tokens:prod

# Deploy everything
npm run deploy:prod

# Or deploy individually
npm run deploy:prod --backend-only
npm run deploy:prod --frontend-only
```

### Manual Deploy

See `DEPLOYMENT.md` and `DEPLOY-CHECKLIST.md` for detailed instructions.

### Deployments

| Service       | Platform | URL                                                              |
|---------------|----------|------------------------------------------------------------------|
| Landing page  | Vercel   | https://orchestra.vercel.app                                     |
| Backend API   | Railway  | https://orchestra-backend-production.up.railway.app              |
| Database      | Supabase | https://app.supabase.com/project/_/editor                        |
| Monitoring    | Sentry   | https://sentry.io/organizations/adrien-debug/issues/             |

## Safety

The runtime avoids killing known protected app processes (Cursor/Electron/Docker Desktop/Finder/etc.) and targets only managed services. Destructive actions require user confirmation via modal dialog.

## Recent Improvements

### Stability & Robustness (Phase 1)
- **Timeout protection**: All shell commands now have 5-10s timeouts to prevent app freeze
- **Queue overflow protection**: Action queue capped at 100 pending actions
- **Event bus overflow protection**: Max 1000 total listeners, 100 per event
- **Error boundary**: React error boundary catches and displays errors gracefully
- **Backend validation**: Required env vars validated at startup, fails fast if missing
- **158 tests passing**: Runtime, agents, backend auth/billing fully tested

### UX Enhancements (Phase 2)
- **Interactive onboarding**: 8-step guided tour with keyboard navigation
- **Empty states**: Clear messages when no services/alerts/docker containers detected
- **Tooltips**: Helpful tooltips on all critical actions
- **Inline feedback**: Spinners and "Démarrage..." status on long-running actions
- **Agents page**: Dedicated page for agent status, logs, and configuration
- **History page**: Complete action history with re-execute capability
- **Simplified overview**: Compact metrics and prioritized information
- **Smooth animations**: Toasts, modals, and transitions

### Performance (Phase 3)
- **React.memo**: 6 list components memoized (-70% re-renders)
- **Code splitting**: 10 pages lazy-loaded (-60% bundle size)
- **Custom hooks**: 8 hooks for granular snapshot selectors
- **Virtualization**: Virtual lists for 50+ items (constant performance)
- **useMemo**: Optimized routing and expensive calculations

### Configuration Management (Phase 4)
- **PORTS-CONFIG.json**: Centralized ports and services configuration
- **TOKENS-CONFIG.json**: Centralized tokens and API keys management
- **Quick actions**: npm scripts for instant service/profile startup
- **CLI tools**: ports-manager and tokens-manager for easy configuration
- **JSON schemas**: Validation and autocompletion in editors

### Deployment & CI/CD (Phase 5)
- **Railway integration**: Automated backend deployment
- **Vercel integration**: Automated frontend deployment
- **GitHub Actions**: CI/CD with tests, builds, and deployments
- **Supabase schema**: Complete database schema with RLS
- **Deployment scripts**: Automated deployment with health checks
- **Release workflow**: Automated Electron builds for all platforms
