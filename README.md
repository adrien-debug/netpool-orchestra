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

### Intelligent Agents
- **Advisor Agent** — conversational AI assistant with tool-use (context-aware actions)
- **Preventive Agent** — trend analysis (RAM/CPU), crash-loop detection, proactive alerts
- **Auto-Fix Agent** — rule-based automated fixes with circuit breaker and suggest/auto modes
- **Performance Agent** — health scoring (A-F grade), top consumers, actionable recommendations
- **Onboarding Agent** — machine scan, auto-generates `services.yaml`

### AI Layer
- Multi-provider: OpenAI, Anthropic, Ollama (local)
- Streaming chat panel with inline action buttons
- Secure API key storage via OS keychain (`safeStorage`)

### Platform
- macOS, Windows, Linux packaging (dmg/nsis/AppImage)
- System tray icon with dynamic menu
- Native notifications for critical alerts
- Auto-update with license gate
- SaaS backend (Railway + Supabase): auth, billing (Stripe), config sync, telemetry
- Landing page (Next.js on Vercel)

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
npm run devctl -- free-port 4000
npm run devctl -- restart github-mcp
npm run devctl -- profile focus
npm run devctl -- recovery
```

## Tests

```bash
npm test              # run once
npm run test:watch    # watch mode
```

## Config

- `config/services.yaml` — services, process match patterns, start/stop commands, max instances
- `config/profiles.yaml` — startup/shutdown profiles

Update paths and commands to match your machine before using destructive actions.

## Architecture

```
electron/
  main.ts              — Electron main process
  runtime.ts           — thin orchestrator
  preload.cts          — IPC bridge
  updater.ts           — auto-update + license gate
  lib/
    config.ts          — Zod schemas, YAML reading
    logger.ts          — centralized logging
    process-utils.ts   — process matching/killing
    ports.ts           — port listing (lsof)
    docker.ts          — Docker container listing
    health.ts          — service health checks
    metrics-history.ts — sliding window metrics + log persistence
    platform.ts        — cross-platform utilities (ports, kill, ps)
  agents/
    event-bus.ts       — pub/sub event bus
    base-agent.ts      — abstract agent class
    agent-runtime.ts   — agent lifecycle manager
    advisor-agent.ts
    onboarding-agent.ts
    preventive-agent.ts
    autofix-agent.ts
    performance-agent.ts
  ai/
    provider.ts        — AIProvider interface
    router.ts          — multi-provider routing
    key-store.ts       — secure key storage
    openai.ts / anthropic.ts / ollama.ts
  action-queue.ts      — mutex-based action serialization

backend/               — Express + Supabase API (Railway)
  src/index.ts         — Express server
  src/supabase.ts      — Supabase client
  src/routes/          — auth, billing, license, config-sync, telemetry, updates
  Dockerfile           — Railway deployment
  schema.sql           — Supabase migration

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

The runtime avoids killing known protected app processes (Cursor/Electron/Docker Desktop/Finder/etc.) and targets only managed services.
