import { memo } from "react";
import type { ServiceItem } from "@shared/types";
import { useAppStore } from "@core/store";
import { toneClass } from "../design";
import { Loader } from "lucide-react";

export const ServiceRow = memo(function ServiceRow({ item }: { item: ServiceItem }) {
  const runAction = useAppStore((s) => s.runAction);
  const actionInProgress = useAppStore((s) => s.actionInProgress);

  return (
    <div className="row grid-service">
      <div>
        <div className="row-title">{item.name}</div>
        <div className="row-subtle">
          {item.kind}
          {item.optional ? " · optionnel" : ""}
        </div>
        <div className="row-subtle mono">{item.pids.slice(0, 3).join(", ") || "-"}</div>
      </div>
      <div>
        <span className={`badge ${toneClass[item.severity]}`}>{item.status}</span>
      </div>
      <div>
        {item.instances}/{item.expectedInstances}
      </div>
      <div>{item.cpu}</div>
      <div>{item.memory}</div>
      <div>{item.ports.length ? item.ports.join(", ") : "—"}</div>
      <div>{item.uptime}</div>
      <div className="row-actions">
        <button
          className="button button-ghost"
          title="Démarre ce service avec la commande configurée dans services.yaml"
          onClick={() => void runAction("service-start", { serviceId: item.id })}
          disabled={actionInProgress === "service-start"}
        >
          {actionInProgress === "service-start" ? (
            <>
              <Loader size={14} style={{ animation: "spin 1s linear infinite" }} />
              Démarrage...
            </>
          ) : (
            "Démarrer"
          )}
        </button>
        <button
          className="button button-secondary"
          title="Arrête puis relance ce service"
          onClick={() => void runAction("service-restart", { serviceId: item.id })}
          disabled={actionInProgress === "service-restart"}
        >
          {actionInProgress === "service-restart" ? (
            <>
              <Loader size={14} style={{ animation: "spin 1s linear infinite" }} />
              Redémarrage...
            </>
          ) : (
            "Redémarrer"
          )}
        </button>
        <button
          className="button button-danger"
          title="Arrête uniquement ce service géré"
          onClick={() => void runAction("service-stop", { serviceId: item.id })}
          disabled={actionInProgress === "service-stop"}
        >
          {actionInProgress === "service-stop" ? (
            <>
              <Loader size={14} style={{ animation: "spin 1s linear infinite" }} />
              Arrêt...
            </>
          ) : (
            "Arrêter"
          )}
        </button>
      </div>
    </div>
  );
});
