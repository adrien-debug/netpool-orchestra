# Changelog

All notable changes to Orchestra will be documented in this file.

## [Unreleased]

### Added
- **Timeout protection** on all shell commands (5-10s) to prevent app freeze
- **Action queue overflow protection** (max 100 pending actions)
- **Event bus overflow protection** (max 1000 total listeners, 100 per event)
- **React ErrorBoundary** to catch and display errors gracefully
- **Backend env vars validation** at startup (fails fast if missing required vars)
- **Empty states** for services, alerts, and Docker containers
- **Tooltips** on all critical actions (Scanner, Réparer, Récupération avancée)
- **AI Settings UI** in Settings page to configure OpenAI/Anthropic API keys

### Fixed
- Shell commands can no longer hang indefinitely (timeout protection)
- Action queue can no longer overflow memory (capped at 100)
- Event bus can no longer overflow memory (capped at 1000 listeners)
- Backend now fails fast if env vars are missing (instead of silent failure)
- React errors now display gracefully instead of white screen

### Improved
- Better UX with empty states and helpful tooltips
- Clearer feedback on what each action does
- More robust error handling throughout the app

## [0.1.0] - 2024-04-13

### Initial Release
- Live process, port, CPU, RAM and Docker visibility
- Duplicate detection for declared services
- One-click actions: start/stop/restart, clean duplicates, free port, recovery
- Global launcher (Cmd/Ctrl + Shift + Space)
- YAML registry for services and profiles
- CLI `devctl` mapped to the same runtime engine
- Smart polling (pauses when app is in background)
- 5 intelligent agents: Advisor, Preventive, Auto-Fix, Performance, Onboarding
- Multi-provider AI (OpenAI, Anthropic, Ollama)
- Streaming chat panel with inline action buttons
- SaaS backend: auth, billing (Stripe), config sync, telemetry
- Landing page (Next.js on Vercel)
- Cross-platform packaging (macOS, Windows, Linux)
- 88 tests covering core functionality
