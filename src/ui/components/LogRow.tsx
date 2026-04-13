import type { LogItem } from "@shared/types";
import { toneClass } from "../design";

export function LogRow({ item }: { item: LogItem }) {
  const tone = item.level === "error" ? "danger" : item.level === "warn" ? "warning" : item.level === "success" ? "success" : "info";
  return (
    <div className="row grid-log">
      <div className="mono subtle">{item.timestamp}</div>
      <div>
        <span className={`badge ${toneClass[tone]}`}>{item.level}</span>
      </div>
      <div>{item.message}</div>
      <div className="mono subtle">{item.scope}</div>
    </div>
  );
}
