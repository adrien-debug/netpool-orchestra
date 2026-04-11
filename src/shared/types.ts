export type Severity = "info" | "success" | "warning" | "danger" | "neutral";
export type ServiceKind = "mcp" | "web" | "dev" | "docker" | "system";
export type HealthState = "healthy" | "degraded" | "duplicate" | "stopped" | "unknown";

export interface MetricItem {
  id: string;
  label: string;
  value: string;
  hint?: string;
  tone: Severity;
}

export interface AlertItem {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  actionLabel?: string;
  actionId?: string;
  actionPayload?: RuntimeActionPayload;
}

export interface ServiceItem {
  id: string;
  name: string;
  kind: ServiceKind;
  status: HealthState;
  severity: Severity;
  optional?: boolean;
  instances: number;
  expectedInstances: number;
  pids: number[];
  cpu: string;
  memory: string;
  ports: number[];
  uptime: string;
}

export interface PortItem {
  id: string;
  port: number;
  processName: string;
  pid: number;
  status: "ok" | "conflict" | "free";
  serviceName?: string;
}

export interface DockerItem {
  id: string;
  containerId: string;
  name: string;
  image: string;
  state: string;
  status: string;
}

export interface LogItem {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
  scope: string;
}

export interface RuntimeSnapshot {
  metrics: MetricItem[];
  alerts: AlertItem[];
  services: ServiceItem[];
  ports: PortItem[];
  docker: DockerItem[];
  logs: LogItem[];
}

export interface RuntimeActionPayload {
  serviceId?: string;
  profileId?: string;
  port?: number;
}

export interface RuntimeActionResult {
  ok: boolean;
  message: string;
  killed?: string[];
}

export interface CommandAction {
  id: string;
  title: string;
  subtitle: string;
  category: "action" | "service" | "profile" | "navigation";
  risk: "safe" | "guided" | "force";
  shortcut?: string;
  runActionId?: string;
  payload?: RuntimeActionPayload;
  navigateTo?: string;
}
