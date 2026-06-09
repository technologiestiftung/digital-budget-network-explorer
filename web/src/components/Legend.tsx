import { useStore } from "../store";
import { TYPE_COLORS, TYPE_LABELS, EINZELPLAN_COLOR } from "../colors";

interface Props {
  nodeCount: number;
  edgeCount: number;
}

export default function Legend({ nodeCount, edgeCount }: Props) {
  const data = useStore((s) => s.data);
  const mode = useStore((s) => s.mode);
  if (!data) return null;

  return (
    <div className="legend">
      <div className="legend-stats">
        {nodeCount} Knoten · {edgeCount} Kanten
      </div>
      <div className="legend-items">
        {mode === "bipartite" && (
          <div className="legend-item">
            <span className="dot" style={{ background: EINZELPLAN_COLOR }} />
            Einzelplan
          </div>
        )}
        {Object.entries(TYPE_LABELS).map(([id, label]) => (
          <div className="legend-item" key={id} title={label}>
            <span
              className="dot"
              style={{ background: TYPE_COLORS[id] }}
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
