import type { MetricItem } from "@shared/types";
import { toneClass } from "../design";

export function MetricCard({ item }: { item: MetricItem }) {
  return (
    <div className={`metric-card ${toneClass[item.tone]}`}>
      <div className="metric-label">{item.label}</div>
      <div className="metric-value">{item.value}</div>
      {item.hint ? <div className="metric-hint">{item.hint}</div> : null}
    </div>
  );
}
