import { useEffect, useMemo } from "react";
import { useStore } from "./store";
import { loadGraph } from "./data/loadGraph";
import { buildGraph } from "./graph/buildGraph";
import GraphView from "./components/GraphView";
import FilterPanel from "./components/FilterPanel";
import DetailPanel from "./components/DetailPanel";
import Legend from "./components/Legend";
import Scrollytelling from "./story/Scrollytelling";

export default function App() {
  const data = useStore((s) => s.data);
  const loading = useStore((s) => s.loading);
  const error = useStore((s) => s.error);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const mode = useStore((s) => s.mode);
  const filters = useStore((s) => s.filters);
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const search = useStore((s) => s.search);
  const setData = useStore((s) => s.setData);
  const setError = useStore((s) => s.setError);
  const selectNode = useStore((s) => s.selectNode);

  useEffect(() => {
    loadGraph()
      .then(setData)
      .catch((err) => setError(String(err.message ?? err)));
  }, [setData, setError]);

  const computed = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };
    return buildGraph(data, filters, mode);
  }, [data, filters, mode]);

  if (error) {
    return (
      <div className="fullscreen-msg error">
        <div>
          <h2>Fehler beim Laden</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="fullscreen-msg">
        <div>Lade Datensatz…</div>
      </div>
    );
  }

  if (view === "story") {
    return <Scrollytelling />;
  }

  return (
    <div className="layout">
      <FilterPanel />
      <main className="stage">
        <button className="back-to-story" onClick={() => setView("story")}>
          ← Intro
        </button>
        <GraphView
          computed={computed}
          selectedNodeId={selectedNodeId}
          search={search}
          onSelect={selectNode}
        />
        <Legend nodeCount={computed.nodes.length} edgeCount={computed.edges.length} />
      </main>
      <DetailPanel />
    </div>
  );
}
