import type { RuntimeSnapshot } from "./types";

export const mockSnapshot: RuntimeSnapshot = {
  metrics: [
    { id: "node", label: "Node processes", value: "37", hint: "demo mode", tone: "info" },
    { id: "cpu", label: "CPU usage", value: "15.2%", hint: "idle 84.8%", tone: "success" },
    { id: "ram", label: "Available RAM", value: "5.2 GB", hint: "92% used", tone: "warning" },
    { id: "docker", label: "Docker containers", value: "6", hint: "runtime sample", tone: "neutral" }
  ],
  alerts: [
    { id: "a1", title: "4x github-mcp instances detected", description: "3 duplicate instances can be removed safely.", severity: "danger", actionLabel: "Clean duplicates" },
    { id: "a2", title: "Port 4000 conflict", description: "A secondary Next.js instance is listening on port 4000.", severity: "warning", actionLabel: "Free port" }
  ],
  services: [
    {
      id: "github-mcp",
      name: "github-mcp",
      kind: "mcp",
      status: "duplicate",
      severity: "danger",
      instances: 4,
      expectedInstances: 1,
      pids: [21211, 21254, 21301, 21444],
      cpu: "2.3%",
      memory: "480 MB",
      ports: [],
      uptime: "4h 10m"
    },
    {
      id: "next-main",
      name: "next-main",
      kind: "web",
      status: "degraded",
      severity: "warning",
      instances: 2,
      expectedInstances: 1,
      pids: [18372, 19384],
      cpu: "3.1%",
      memory: "390 MB",
      ports: [3000, 4000],
      uptime: "53m"
    },
    {
      id: "clawd-main",
      name: "clawd-main",
      kind: "dev",
      status: "healthy",
      severity: "success",
      instances: 1,
      expectedInstances: 1,
      pids: [20111],
      cpu: "4.7%",
      memory: "510 MB",
      ports: [],
      uptime: "52m"
    }
  ],
  ports: [
    { id: "p1", port: 3000, processName: "next dev", pid: 18372, status: "ok", serviceName: "next-main" },
    { id: "p2", port: 4000, processName: "next dev", pid: 19384, status: "conflict", serviceName: "next-main" }
  ],
  docker: [
    {
      id: "d1",
      containerId: "f0e78a91f9f4",
      name: "redis-dev",
      image: "redis:7",
      state: "running",
      status: "Up 3 hours"
    }
  ],
  logs: [
    { id: "l1", timestamp: "10:45:12", level: "success", message: "Killed 3 github-mcp instances.", scope: "duplicates.clean" },
    { id: "l2", timestamp: "10:45:15", level: "warn", message: "Port 4000 still occupied by next dev.", scope: "ports.scan" }
  ]
};
