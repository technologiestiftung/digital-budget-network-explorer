import { useEffect, useRef } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import { circular } from "graphology-layout";
import forceAtlas2 from "graphology-layout-forceatlas2";
import FA2Layout from "graphology-layout-forceatlas2/worker";
import type { ComputedGraph } from "../types";
import { colorForKeyword, EINZELPLAN_COLOR } from "../colors";

interface Props {
  computed: ComputedGraph;
  selectedNodeId: string | null;
  search: string;
  nodeSizeMetric: "count" | "budget";
  onSelect: (id: string | null) => void;
}

interface RenderState {
  selected: string | null;
  hovered: string | null;
  highlighted: Set<string>; // Nachbarn von selected/hovered
  search: string;
}

function scaleSize(frequency: number, max: number): number {
  if (max <= 1) return 6;
  const t = Math.sqrt(frequency) / Math.sqrt(max);
  return 4 + t * 18;
}

export default function GraphView({
  computed,
  selectedNodeId,
  search,
  nodeSizeMetric,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const layoutRef = useRef<FA2Layout | null>(null);
  const stateRef = useRef<RenderState>({
    selected: null,
    hovered: null,
    highlighted: new Set(),
    search: "",
  });

  // Sigma einmalig initialisieren
  useEffect(() => {
    if (!containerRef.current) return;
    const graph = new Graph({ multi: false, type: "undirected" });
    graphRef.current = graph;

    const renderer = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      defaultEdgeColor: "#d8dee6",
      labelFont: "Inter, system-ui, sans-serif",
      labelColor: { color: "#1a2330" },
      labelDensity: 0.5,
      labelGridCellSize: 80,
      labelRenderedSizeThreshold: 7,
      zIndex: true,
    });
    sigmaRef.current = renderer;

    // Reducer: Hervorhebung von Auswahl/Hover/Suche
    renderer.setSetting("nodeReducer", (node, data) => {
      const st = stateRef.current;
      const res = { ...data };
      const active = st.selected ?? st.hovered;
      const q = st.search.trim().toLowerCase();

      // Prioritaet 1: Ein Knoten ist ausgewaehlt oder gehovert -> Nachbarschaft anzeigen
      if (active) {
        if (node === active) {
          res.zIndex = 2;
          res.forceLabel = true;
        } else if (st.highlighted.has(node)) {
          res.zIndex = 1;
          res.forceLabel = true;
        } else {
          res.color = "#e6e9ed";
          res.label = "";
          res.zIndex = 0;
        }
        return res;
      }

      // Prioritaet 2: Suche ist aktiv (und kein Knoten ausgewaehlt/gehovert) -> Suchtreffer anzeigen
      if (q) {
        const match = String(data.label ?? "").toLowerCase().includes(q);
        if (!match) {
          res.color = "#e6e9ed";
          res.label = "";
          res.zIndex = 0;
        } else {
          res.zIndex = 2;
          res.forceLabel = true;
        }
        return res;
      }

      return res;
    });

    renderer.setSetting("edgeReducer", (edge, data) => {
      const st = stateRef.current;
      const res = { ...data };
      const active = st.selected ?? st.hovered;
      const g = graphRef.current!;
      if (active) {
        const [s, t] = g.extremities(edge);
        if (s === active || t === active) {
          res.color = "#9aa7b5";
          res.zIndex = 1;
        } else {
          res.color = "#f0f2f5";
          res.hidden = false;
        }
      }
      return res;
    });

    renderer.on("clickNode", ({ node }) => onSelect(node));
    renderer.on("clickStage", () => onSelect(null));
    renderer.on("enterNode", ({ node }) => {
      const g = graphRef.current!;
      stateRef.current.hovered = node;
      stateRef.current.highlighted = new Set(g.neighbors(node));
      renderer.refresh();
      if (containerRef.current) containerRef.current.style.cursor = "pointer";
    });
    renderer.on("leaveNode", () => {
      stateRef.current.hovered = null;
      if (!stateRef.current.selected) stateRef.current.highlighted = new Set();
      renderer.refresh();
      if (containerRef.current) containerRef.current.style.cursor = "default";
    });

    return () => {
      layoutRef.current?.kill();
      layoutRef.current = null;
      renderer.kill();
      sigmaRef.current = null;
      graphRef.current = null;
    };
  }, [onSelect]);

  // Graph neu aufbauen, wenn sich die berechneten Daten aendern
  useEffect(() => {
    const graph = graphRef.current;
    const renderer = sigmaRef.current;
    if (!graph || !renderer) return;

    layoutRef.current?.kill();
    layoutRef.current = null;
    graph.clear();

    const maxVal = computed.nodes.reduce((m, n) => {
      const val = nodeSizeMetric === "budget" ? n.digSum : n.frequency;
      return Math.max(m, val);
    }, 1);
    const maxWeight = computed.edges.reduce((m, e) => Math.max(m, e.weight), 1);

    for (const n of computed.nodes) {
      const val = nodeSizeMetric === "budget" ? n.digSum : n.frequency;
      graph.addNode(n.id, {
        label: n.label,
        size: scaleSize(val, maxVal),
        color: n.kind === "einzelplan" ? EINZELPLAN_COLOR : colorForKeyword(n.bereich),
        kind: n.kind,
        x: 0,
        y: 0,
      });
    }
    for (const e of computed.edges) {
      if (!graph.hasNode(e.source) || !graph.hasNode(e.target)) continue;
      if (graph.hasEdge(e.source, e.target)) continue;
      graph.addEdge(e.source, e.target, {
        weight: e.weight,
        size: 0.4 + (e.weight / maxWeight) * 3,
      });
    }

    if (graph.order === 0) {
      renderer.refresh();
      return;
    }

    // Startpositionen kreisfoermig, dann ForceAtlas2 im Worker animieren
    circular.assign(graph);
    const settings = forceAtlas2.inferSettings(graph);
    const layout = new FA2Layout(graph, {
      settings: { ...settings, slowDown: 5 },
    });
    layoutRef.current = layout;
    layout.start();
    const stopAfter = Math.min(5000, 1500 + graph.order * 6);
    const timer = setTimeout(() => layout.stop(), stopAfter);

    // Kamera zuruecksetzen
    renderer.getCamera().animatedReset({ duration: 300 });

    return () => clearTimeout(timer);
  }, [computed, nodeSizeMetric]);

  // Auswahl/Suche -> Reducer-Status aktualisieren + neu zeichnen
  useEffect(() => {
    const graph = graphRef.current;
    const renderer = sigmaRef.current;
    if (!graph || !renderer) return;
    stateRef.current.selected = selectedNodeId;
    stateRef.current.search = search;
    stateRef.current.highlighted =
      selectedNodeId && graph.hasNode(selectedNodeId)
        ? new Set(graph.neighbors(selectedNodeId))
        : new Set();
    renderer.refresh();

    // Bei Auswahl sanft auf den Knoten zoomen
    if (selectedNodeId && graph.hasNode(selectedNodeId)) {
      const disp = renderer.getNodeDisplayData(selectedNodeId);
      if (disp) {
        renderer
          .getCamera()
          .animate({ x: disp.x, y: disp.y, ratio: 0.6 }, { duration: 400 });
      }
    }
  }, [selectedNodeId, search]);

  return <div ref={containerRef} className="graph-canvas" />;
}
