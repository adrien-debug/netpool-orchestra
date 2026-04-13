import { memo } from "react";
import { AlertTriangle } from "lucide-react";
import type { AlertItem } from "@shared/types";
import { useAppStore } from "@core/store";

export const AlertCard = memo(function AlertCard({ item }: { item: AlertItem }) {
  const runAction = useAppStore((s) => s.runAction);

  let actionId: string = item.actionId ?? "doctor";
  let payload: { port?: number; serviceId?: string; profileId?: string } | undefined = item.actionPayload;

  if (!item.actionId && item.actionLabel) {
    const lower = item.actionLabel.toLowerCase();
    if (lower.includes("doublon")) actionId = "clean-duplicates";
    if (lower.includes("port")) {
      actionId = "free-port";
      payload = undefined;
    }
    if (lower.includes("zombie")) actionId = "clean-zombies";
    if (lower.includes("réparer") || lower.includes("recovery")) actionId = "repair-now";
  }

  return (
    <div className="alert-card">
      <div className="alert-icon">
        <AlertTriangle size={18} />
      </div>
      <div className="alert-main">
        <div className="alert-title">{item.title}</div>
        <div className="alert-desc">{item.description}</div>
      </div>
      {item.actionLabel ? (
        <button
          className="button button-secondary"
          title="Lancer l'action recommandée pour ce problème"
          onClick={() => void runAction(actionId, payload)}
        >
          {item.actionLabel}
        </button>
      ) : null}
    </div>
  );
});
