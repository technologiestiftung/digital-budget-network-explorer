import { useState } from "react";
import { useStore } from "../store";
import { TYPE_COLORS, TYPE_LABELS, EINZELPLAN_COLOR } from "../colors";

interface Props {
  nodeCount: number;
  edgeCount: number;
}

export default function Legend({ nodeCount, edgeCount }: Props) {
  const data = useStore((s) => s.data);
  const mode = useStore((s) => s.mode);
  const [isOpen, setIsOpen] = useState(false);

  if (!data) return null;

  return (
    <div className={`legend ${isOpen ? "open" : "closed"}`}>
      <button 
        className="legend-toggle" 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span>Farblegende &amp; Stats</span>
        <span className="legend-chevron">{isOpen ? "▼" : "▲"}</span>
      </button>
      
      {isOpen && (
        <div className="legend-content">
          <div className="legend-stats">
            <strong>Sichtbares Netzwerk</strong><br/>
            {nodeCount} Knoten · {edgeCount} Verbindungen
          </div>
          
          <div className="legend-section-title">Knotenfarben</div>
          <div className="legend-items">
            {mode === "bipartite" && (
              <div className="legend-item">
                <span className="dot" style={{ background: EINZELPLAN_COLOR }} />
                Einzelplan (Ressort)
              </div>
            )}
            {Object.entries(TYPE_LABELS).map(([id, label]) => (
              <div className="legend-item" key={id}>
                <span
                  className="dot"
                  style={{ background: TYPE_COLORS[id] }}
                />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
