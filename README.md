# Orchestra

Orchestra is a desktop control center for local dev stacks (Electron + React + TypeScript).

It gives you:
- live process, port, CPU, RAM and Docker visibility
- duplicate detection for declared services
- one-click actions: start/stop/restart, clean duplicates, free port, recovery
- global launcher (`Cmd/Ctrl + Shift + Space`)
- YAML registry for services and profiles
- CLI `devctl` mapped to the same runtime engine

## Run the app

```bash
npm install
npm run dev
```

## Build desktop app

```bash
npm run dist
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

## Config

- `config/services.yaml`: services, process match patterns, start/stop commands, max instances
- `config/profiles.yaml`: startup/shutdown profiles

Update paths and commands to match your machine before using destructive actions.

## Safety

The runtime avoids killing known protected app processes (Cursor/Electron/Docker Desktop/Finder/etc.) and targets only managed services in normal flows.
