import { memo } from "react";
import type { PortItem } from "@shared/types";
import { useAppStore } from "@core/store";
import { toneClass } from "../design";

export const PortRow = memo(function PortRow({ item }: { item: PortItem }) {
  const runAction = useAppStore((s) => s.runAction);
  const tone = item.status === "conflict" ? "danger" : item.status === "ok" ? "success" : "neutral";
  const isFree = item.status === "free";
  return (
    <div className="row grid-port">
      <div className="row-title">{item.port}</div>
      <div>{item.processName}</div>
      <div>{item.pid > 0 ? item.pid : "—"}</div>
      <div>
        <span className={`badge ${toneClass[tone]}`}>{item.status}</span>
      </div>
      <div>{item.serviceName ?? "Inconnu"}</div>
      <div>
        <button
          className="button button-secondary"
          title={isFree ? "Port déjà libre" : "Arrête le process géré sur ce port"}
          disabled={isFree}
          onClick={() => void runAction("free-port", { port: item.port })}
        >
          Libérer le port
        </button>
      </div>
    </div>
  );
});
