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

## Deployments

| Service       | Platform | URL                                                              |
|---------------|----------|------------------------------------------------------------------|
| Landing page  | Vercel   | https://landing-three-red-35.vercel.app                          |
| Backend API   | Railway  | https://orchestra-api-production.up.railway.app                  |
| Database      | Supabase | https://supabase.com/dashboard/project/djcnizqtqxlaaxphwtqd     |

## Safety

The runtime avoids killing known protected app processes (Cursor/Electron/Docker Desktop/Finder/etc.) and targets only managed services. Destructive actions require user confirmation via modal dialog.
