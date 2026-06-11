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
  | { type: "all"; recenter?: boolean }
  | { type: "chain"; upto: number }
  | { type: "set"; ids: string[]; primary?: string };

interface Props {
  data: GraphData;
  /** Keyword-Kette fuer Screen 3. */
  chain: { id: string; type: "kw" | "ep" | "set"; ids?: string[] }[];
  focus: StoryFocus;
}

interface RenderState {
  recenter: boolean;
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
  const prevAmbientRef = useRef(true);
  const stateRef = useRef<RenderState>({
    highlight: new Set(),
    chainVisible: false,
    chainNodes: new Set(),
    ambient: true,
    recenter: true,
  });

  // Sigma + Graph einmalig aufbauen
  useEffect(() => {
    if (!containerRef.current) return;

    // Hintergrund-Netzwerk: Keyword-Ko-Occurrence, moderat gefiltert
    const computed = buildGraph(
      data,
      {
        jahr: 2025,
        bereiche: new Set(),
        klassen: new Set(),
        einzelplaene: new Set(),
        hauptgruppen: new Set(),
        hauptfunktionen: new Set(),
        minFrequency: 1,
        nurDigital: false,
      },
      "bipartite",
    );

    const graph = new Graph({ multi: true, type: "undirected" });
    graphRef.current = graph;

    const maxFreq = computed.nodes.reduce(
      (m, n) => Math.max(m, n.frequency),
      1,
    );
    const maxW = computed.edges.reduce((m, e) => Math.max(m, e.weight), 1);
    for (const n of computed.nodes) {
      const t = Math.sqrt(n.frequency) / Math.sqrt(maxFreq);
      const color = n.kind === "einzelplan" ? "#000000" : colorForType(n.type);
      graph.addNode(n.id, {
        label: n.label,
        baseColor: color,
        color: color,
        size: n.kind === "einzelplan" ? 6 + t * 20 : 3 + t * 16,
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
            res.color = "#1E3791";
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

    // Layout stabilisieren
    const settings = forceAtlas2.inferSettings(graph);
    const layout = new FA2Layout(graph, {
      settings: { ...settings, slowDown: 8 },
    });
    layoutRef.current = layout;
    layout.start();
    const stopTimer = setTimeout(() => {
      layout.stop();
      stableRef.current = true;
      startAmbient();
    }, 3500);

    // Ambient-Drift: sanft per Lerp, damit es beim Wechsel nie springt.
    function startAmbient() {
      if (rafRef.current != null) return;
      const cam = renderer.getCamera();
      const t0 = performance.now();
      const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
      const loop = (now: number) => {
        const st = stateRef.current;
        // Nur driften, wenn kein Fokus aktiv ist. Sonst uebernimmt cam.animate().
        if (
          st.ambient &&
          !st.recenter &&
          st.highlight.size === 0 &&
          !cam.isAnimated()
        ) {
          const t = (now - t0) / 1000;
          const target = {
            x: 1.46 + Math.sin(t * 0.1) * 0.02,
            y: 0.58 + Math.cos(t * 0.08) * 0.02,
            ratio: 1.25 + Math.sin(t * 0.07) * 0.04,
            angle: Math.sin(t * 0.04) * 0.03,
          };
          const cur = cam.getState();
          // weiches Annaehern an den Drift-Zielwert (kein harter Sprung)
          cam.setState({
            x: lerp(cur.x, target.x, 0.04),
            y: lerp(cur.y, target.y, 0.04),
            ratio: lerp(cur.ratio, target.ratio, 0.04),
            angle: lerp(cur.angle, target.angle, 0.04),
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
      // In the new story design, these are distinct examples, not a cumulative chain.
      const chainItem = chain[focus.upto];
      const highlight = new Set<string>();
      let newCenterIds: string[] = [];

      if (chainItem.type === "set" && chainItem.ids) {
        chainItem.ids.forEach((kwId) => {
          const nId = `kw:${kwId}`;
          if (graph.hasNode(nId)) {
            highlight.add(nId);
            newCenterIds.push(nId);
            graph.forEachNeighbor(nId, (neighbor) => {
              highlight.add(neighbor);
            });
          }
        });
      } else {
        const last = `${chainItem.type}:${chainItem.id}`;
        if (graph.hasNode(last)) {
          highlight.add(last);
          newCenterIds.push(last);
          graph.forEachNeighbor(last, (neighbor) => {
            highlight.add(neighbor);
          });
        }
      }

      st.highlight = highlight;
      st.chainNodes = new Set();
      st.chainVisible = false;
      st.ambient = false;
      centerIds = newCenterIds;
    } else {
      // "set" focus, usually for Ministry slides where primary is the EP
      const primaryNode = focus.primary ? `ep:${focus.primary}` : null;
      const highlight = new Set(
        focus.ids.map((c) => `kw:${c}`).filter((n) => graph.hasNode(n)),
      );
      // Wenn kein Primary gesetzt ist (z.B. Erklärfolie), zeige alle
      // verbundenen Einzelplan-Nachbarn mit an.
      if (primaryNode && graph.hasNode(primaryNode)) {
        highlight.add(primaryNode);
        centerIds = [primaryNode];
      } else {
        for (const n of highlight) {
          graph.forEachNeighbor(n, (neighbor) => highlight.add(neighbor));
        }
        centerIds = Array.from(highlight);
      }
      st.highlight = highlight;
      st.chainVisible = false;
      st.chainNodes = new Set();
      st.ambient = false;
    }

    renderer.refresh();

    // Kamera auf den Fokus bewegen (einheitliche, weiche Fahrten)
    const cam = renderer.getCamera();
    const EASE = { duration: 1100, easing: "cubicInOut" as const };
    st.recenter = (focus as any).recenter ?? false;
    if (st.ambient) {
      if ((focus as any).recenter) {
        cam.animate({ x: 0.5, y: 0.5, ratio: 1.15, angle: 0 }, EASE);
      } else if (!prevAmbientRef.current) {
        // Von einem Fokus zurueck in den Ambient-Modus: zur Offset-Position fahren
        cam.animate({ x: 0.7, y: 0.65, ratio: 1.35, angle: 0 }, EASE);
      }
      prevAmbientRef.current = true;
      return;
    }
    prevAmbientRef.current = false;
    // Bounding-Box der Fokus-Knoten bestimmen -> konsistenter Zoom
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity,
      n = 0;
    for (const id of centerIds) {
      const dd = renderer.getNodeDisplayData(id);
      if (dd) {
        minX = Math.min(minX, dd.x);
        maxX = Math.max(maxX, dd.x);
        minY = Math.min(minY, dd.y);
        maxY = Math.max(maxY, dd.y);
        n++;
      }
    }
    if (n === 0) return;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const spread = Math.max(maxX - minX, maxY - minY);
    // Ratio aus Ausdehnung ableiten (mit Polster), begrenzt fuer ruhige Optik
    const ratio = Math.min(1.0, Math.max(0.4, spread * 1.6 + 0.4));
    cam.animate({ x: cx, y: cy, ratio, angle: 0 }, EASE);
  }, [focus, chain]);

  return <div ref={containerRef} className="story-bg" />;
}
