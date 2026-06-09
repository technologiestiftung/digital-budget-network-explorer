import { useEffect, useRef } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import { circular } from "graphology-layout";
import forceAtlas2 from "graphology-layout-forceatlas2";
import FA2Layout from "graphology-layout-forceatlas2/worker";
import type { GraphData } from "../types";
import { buildGraph } from "../graph/buildGraph";
import { colorForType } from "../colors";

export type StoryFocus =
  | { type: "all" }
  | { type: "chain"; upto: number } // hebt chain[0..upto] hervor, zentriert auf upto
  | { type: "set"; ids: string[]; primary?: string };

interface Props {
  data: GraphData;
  /** Keyword-Kette fuer Screen 3 (lokale IDs). */
  chain: string[];
  focus: StoryFocus;
}

interface RenderState {
  highlight: Set<string>;
  chainVisible: boolean;
  chainNodes: Set<string>;
  ambient: boolean;
}

const DIM = "#dde3ea";

export default function StoryBackground({ data, chain, focus }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const layoutRef = useRef<FA2Layout | null>(null);
  const rafRef = useRef<number | null>(null);
  const stableRef = useRef(false);
  const stateRef = useRef<RenderState>({
    highlight: new Set(),
    chainVisible: false,
    chainNodes: new Set(),
    ambient: true,
  });

  // Sigma + Graph einmalig aufbauen
  useEffect(() => {
    if (!containerRef.current) return;

    // Hintergrund-Netzwerk: Keyword-Ko-Occurrence, moderat gefiltert
    const computed = buildGraph(
      data,
      {
        jahr: null,
        bereiche: new Set(),
        klassen: new Set(),
        einzelplaene: new Set(),
        hauptgruppen: new Set(),
        hauptfunktionen: new Set(),
        minFrequency: 4,
        nurDigital: false,
      },
      "keyword",
    );

    const graph = new Graph({ multi: true, type: "undirected" });
    graphRef.current = graph;

    const maxFreq = computed.nodes.reduce((m, n) => Math.max(m, n.frequency), 1);
    const maxW = computed.edges.reduce((m, e) => Math.max(m, e.weight), 1);
    for (const n of computed.nodes) {
      const t = Math.sqrt(n.frequency) / Math.sqrt(maxFreq);
      graph.addNode(n.id, {
        label: n.label,
        baseColor: colorForType(n.type),
        color: colorForType(n.type),
        size: 3 + t * 16,
        x: 0,
        y: 0,
      });
    }
    for (const e of computed.edges) {
      if (graph.hasEdge(e.source, e.target)) continue;
      graph.addEdge(e.source, e.target, {
        size: 0.3 + (e.weight / maxW) * 2,
        story: false,
      });
    }

    circular.assign(graph);

    const renderer = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      defaultEdgeColor: "#eef1f5",
      labelFont: "Inter, system-ui, sans-serif",
      labelColor: { color: "#46566b" },
      labelRenderedSizeThreshold: 14,
      labelDensity: 0.3,
      zIndex: true,
      allowInvalidContainer: true,
    });
    sigmaRef.current = renderer;
    // Interaktion im Hintergrund deaktivieren (reines Storytelling)
    renderer.getMouseCaptor().kill();
    renderer.getTouchCaptor().kill();

    renderer.setSetting("nodeReducer", (node, d) => {
      const st = stateRef.current;
      const res = { ...d };
      if (st.highlight.size === 0) {
        res.label = ""; // im Ambient-Modus nur sehr grosse Knoten (Threshold)
        return res;
      }
      if (st.highlight.has(node)) {
        res.color = (d as { baseColor?: string }).baseColor ?? d.color;
        res.zIndex = 2;
        res.forceLabel = true;
        res.size = (d.size as number) * 1.4;
      } else {
        res.color = DIM;
        res.label = "";
        res.zIndex = 0;
      }
      return res;
    });

    renderer.setSetting("edgeReducer", (edge, d) => {
      const st = stateRef.current;
      const res = { ...d };
      const g = graphRef.current!;
      const isStory = (d as { story?: boolean }).story === true;

      if (isStory) {
        if (st.chainVisible) {
          const [s, t] = g.extremities(edge);
          if (st.chainNodes.has(s) && st.chainNodes.has(t)) {
            res.hidden = false;
            res.color = "#2f6fed";
            res.size = 2.5;
            res.zIndex = 3;
            return res;
          }
        }
        res.hidden = true;
        return res;
      }

      if (st.highlight.size > 0) {
        const [s, t] = g.extremities(edge);
        if (st.highlight.has(s) && st.highlight.has(t)) {
          res.color = "#aab6c4";
          res.zIndex = 1;
        } else {
          res.color = "#f2f5f8";
        }
      }
      return res;
    });

    // Layout stabilisieren, danach Story-Kanten (Kette) ergaenzen
    const settings = forceAtlas2.inferSettings(graph);
    const layout = new FA2Layout(graph, { settings: { ...settings, slowDown: 8 } });
    layoutRef.current = layout;
    layout.start();
    const stopTimer = setTimeout(() => {
      layout.stop();
      stableRef.current = true;
      // Story-Kanten der Kette ergaenzen (verbinden Keyword-Sequenz sichtbar)
      for (let i = 0; i < chain.length - 1; i++) {
        const a = `kw:${chain[i]}`;
        const b = `kw:${chain[i + 1]}`;
        if (graph.hasNode(a) && graph.hasNode(b)) {
          graph.addEdge(a, b, { size: 2.5, story: true, hidden: true });
        }
      }
      renderer.getCamera().animatedReset({ duration: 600 });
      startAmbient();
    }, 4000);

    // Ambient-Drift (langsame Bewegung im Hero/Stats-Modus)
    function startAmbient() {
      if (rafRef.current != null) return;
      const cam = renderer.getCamera();
      const t0 = performance.now();
      const loop = (now: number) => {
        const st = stateRef.current;
        if (st.ambient && st.highlight.size === 0) {
          const t = (now - t0) / 1000;
          cam.setState({
            x: 0.5 + Math.sin(t * 0.12) * 0.015,
            y: 0.5 + Math.cos(t * 0.09) * 0.015,
            ratio: 1.12 + Math.sin(t * 0.08) * 0.05,
            angle: Math.sin(t * 0.05) * 0.04,
          });
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    }

    return () => {
      clearTimeout(stopTimer);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      layoutRef.current?.kill();
      layoutRef.current = null;
      renderer.kill();
      sigmaRef.current = null;
      graphRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Auf Fokuswechsel reagieren
  useEffect(() => {
    const renderer = sigmaRef.current;
    const graph = graphRef.current;
    if (!renderer || !graph) return;

    const st = stateRef.current;
    let centerIds: string[] = [];

    if (focus.type === "all") {
      st.highlight = new Set();
      st.chainVisible = false;
      st.chainNodes = new Set();
      st.ambient = true;
    } else if (focus.type === "chain") {
      const ids = chain.slice(0, focus.upto + 1).map((c) => `kw:${c}`).filter((n) => graph.hasNode(n));
      st.highlight = new Set(ids);
      st.chainNodes = new Set(ids);
      st.chainVisible = true;
      st.ambient = false;
      const last = `kw:${chain[focus.upto]}`;
      centerIds = graph.hasNode(last) ? [last] : ids;
    } else {
      const ids = focus.ids.map((c) => `kw:${c}`).filter((n) => graph.hasNode(n));
      st.highlight = new Set(ids);
      st.chainVisible = false;
      st.chainNodes = new Set();
      st.ambient = false;
      centerIds = ids;
    }

    renderer.refresh();

    // Kamera auf den Fokus bewegen
    const cam = renderer.getCamera();
    if (st.ambient) return; // Ambient-Loop uebernimmt
    if (centerIds.length === 0) {
      cam.animate({ x: 0.5, y: 0.5, ratio: 1.1, angle: 0 }, { duration: 700 });
      return;
    }
    let sx = 0,
      sy = 0,
      n = 0;
    for (const id of centerIds) {
      const dd = renderer.getNodeDisplayData(id);
      if (dd) {
        sx += dd.x;
        sy += dd.y;
        n++;
      }
    }
    if (n === 0) return;
    const ratio = centerIds.length <= 1 ? 0.45 : centerIds.length <= 4 ? 0.7 : 1.0;
    cam.animate({ x: sx / n, y: sy / n, ratio, angle: 0 }, { duration: 900 });
  }, [focus, chain]);

  return <div ref={containerRef} className="story-bg" />;
}
