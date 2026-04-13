import { memo } from "react";
import type { DockerItem } from "@shared/types";
import { toneClass } from "../design";

export const DockerRow = memo(function DockerRow({ item }: { item: DockerItem }) {
  const tone = item.state.toLowerCase().includes("running") ? "success" : "warning";
  return (
    <div className="row grid-docker">
      <div className="mono">{item.containerId.slice(0, 12)}</div>
      <div className="row-title">{item.name}</div>
      <div>{item.image}</div>
      <div>
        <span className={`badge ${toneClass[tone]}`}>{item.state}</span>
      </div>
      <div className="row-subtle">{item.status}</div>
    </div>
  );
});
