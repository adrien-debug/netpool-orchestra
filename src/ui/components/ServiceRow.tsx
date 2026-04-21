import { memo } from "react";
import type { ServiceItem } from "@shared/types";
import { useAppStore } from "@core/store";
import { CheckCircle, AlertTriangle, XCircle, Copy, Loader as LoaderIcon, Play, RotateCw, Square } from "lucide-react";

const statusIcons = {
  healthy: { icon: CheckCircle, color: "#10b981", label: "OK" },
  degraded: { icon: AlertTriangle, color: "#f59e0b", label: "Attention" },
  stopped: { icon: XCircle, color: "#ef4444", label: "Arrêté" },
  duplicate: { icon: Copy, color: "#f59e0b", label: "Doublon" }
};

export const ServiceRow = memo(function ServiceRow({ item }: { item: ServiceItem }) {
  const runAction = useAppStore((s) => s.runAction);
  const actionInProgress = useAppStore((s) => s.actionInProgress);
  
  const statusInfo = statusIcons[item.status as keyof typeof statusIcons] || statusIcons.stopped;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="row grid-service">
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <StatusIcon size={20} style={{ color: statusInfo.color, flexShrink: 0 }} />
        <div>
          <div className="row-title">{item.name}</div>
          <div className="row-subtle">
            {item.kind}
            {item.optional ? " · optionnel" : ""}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ color: statusInfo.color, fontWeight: 600 }}>{statusInfo.label}</span>
      </div>
      <div>
        {item.instances}/{item.expectedInstances}
      </div>
      <div>{item.cpu}</div>
      <div>{item.memory}</div>
      <div>{item.ports.length ? item.ports.join(", ") : "—"}</div>
      <div>{item.uptime}</div>
      <div className="row-actions">
        {item.status === "stopped" && (
          <button
            className="button button-primary"
            onClick={() => void runAction("service-start", { serviceId: item.id })}
            disabled={actionInProgress === "service-start"}
          >
            {actionInProgress === "service-start" ? (
              <LoaderIcon size={14} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Play size={14} />
            )}
          </button>
        )}
        {item.status === "healthy" && (
          <button
            className="button button-secondary"
            onClick={() => void runAction("service-restart", { serviceId: item.id })}
            disabled={actionInProgress === "service-restart"}
          >
            {actionInProgress === "service-restart" ? (
              <LoaderIcon size={14} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <RotateCw size={14} />
            )}
          </button>
        )}
        {(item.status === "degraded" || item.status === "duplicate") && (
          <button
            className="button button-primary"
            onClick={() => void runAction("service-restart", { serviceId: item.id })}
            disabled={actionInProgress === "service-restart"}
          >
            {actionInProgress === "service-restart" ? (
              <LoaderIcon size={14} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <>
                <RotateCw size={14} />
                Fix
              </>
            )}
          </button>
        )}
        {item.status !== "stopped" && (
          <button
            className="button button-ghost"
            onClick={() => void runAction("service-stop", { serviceId: item.id })}
            disabled={actionInProgress === "service-stop"}
          >
            {actionInProgress === "service-stop" ? (
              <LoaderIcon size={14} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Square size={14} />
            )}
          </button>
        )}
      </div>
    </div>
  );
});
