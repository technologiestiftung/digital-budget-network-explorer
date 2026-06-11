import { useEffect, useMemo, useState } from "react";
import { useStore } from "./store";
import { loadGraph } from "./data/loadGraph";
import { buildGraph } from "./graph/buildGraph";
import GraphView from "./components/GraphView";
import FilterPanel from "./components/FilterPanel";
import DetailPanel from "./components/DetailPanel";
import Legend from "./components/Legend";
import Scrollytelling from "./story/Scrollytelling";
import ProjectModal from "./components/ProjectModal";

export default function App() {
  const data = useStore((s) => s.data);
  const loading = useStore((s) => s.loading);
  const error = useStore((s) => s.error);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const mode = useStore((s) => s.mode);
  const nodeSizeMetric = useStore((s) => s.nodeSizeMetric);
  const filters = useStore((s) => s.filters);
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const search = useStore((s) => s.search);
  const setData = useStore((s) => s.setData);
  const setError = useStore((s) => s.setError);
const selectNode = useStore((s) => s.selectNode);
  const setMobileFilterOpen = useStore((s) => s.setMobileFilterOpen);
  const mobileFilterOpen = useStore((s) => s.mobileFilterOpen);
  const [showProjectModal, setShowProjectModal] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      setView(window.location.pathname.includes("/explorer") ? "explore" : "story");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [setView]);

  useEffect(() => {
    const isExplorer = window.location.pathname.includes("/explorer");
    if (view === "explore" && !isExplorer) {
      window.history.pushState({}, "", "/explorer");
    } else if (view === "story" && isExplorer) {
      window.history.pushState({}, "", "/");
    }
  }, [view]);

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
          <div className="stage-top-buttons">
            <button className="back-to-story" onClick={() => setView("story")}>
              ← Intro
            </button>
            <button className="project-button" onClick={() => setShowProjectModal(true)}>
              Über das Projekt
            </button>
          </div>
          {showProjectModal && (
            <ProjectModal onClose={() => setShowProjectModal(false)} />
          )}
          <GraphView
          computed={computed}
          selectedNodeId={selectedNodeId}
          search={search}
          nodeSizeMetric={nodeSizeMetric}
          onSelect={selectNode}
        />

        <Legend nodeCount={computed.nodes.length} edgeCount={computed.edges.length} />

        <div className="mobile-bottom-bar">
          <button 
            className={`mobile-bottom-btn ${mobileFilterOpen ? "active" : ""}`}
            onClick={() => setMobileFilterOpen(true)}
          >
            <svg viewBox="0 0 24 24"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>
            Filter
          </button>
          <button 
            className={`mobile-bottom-btn ${selectedNodeId ? "active" : ""}`}
            onClick={() => {
              if (!selectedNodeId) {
                // If nothing selected, maybe show a toast or just open empty details? 
                // We let it do nothing or open empty.
              }
            }}
          >
            <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
            Details
          </button>
        </div>
      </main>
      <DetailPanel />
    </div>
  );
}
