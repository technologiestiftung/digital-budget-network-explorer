import type {
  ComputedEdge,
  ComputedGraph,
  ComputedNode,
  Filters,
  GraphData,
  GraphMode,
  Posten,
} from "../types";

/** Wendet die aktiven Filter auf die Postenliste an. */
export function filterPosten(data: GraphData, f: Filters): Posten[] {
  const useJahr = f.jahre.size > 0;
  const useBer = f.bereiche.size > 0;
  const useKl = f.klassen.size > 0;
  const useEp = f.einzelplaene.size > 0;

  return data.posten.filter((p) => {
    if (useJahr && (p.jahr == null || !f.jahre.has(p.jahr))) return false;
    if (useBer && (p.ber == null || !f.bereiche.has(p.ber))) return false;
    if (useKl && (p.kl == null || !f.klassen.has(p.kl))) return false;
    if (useEp && (p.ep == null || !f.einzelplaene.has(p.ep))) return false;
    if (f.nurDigital && !(p.digW && p.digW > 0)) return false;
    return true;
  });
}

interface KeywordAgg {
  frequency: number;
  digSum: number;
  bereichCounts: Map<string, number>;
}

function aggregateKeywords(posten: Posten[]): Map<string, KeywordAgg> {
  const agg = new Map<string, KeywordAgg>();
  for (const p of posten) {
    const dig = p.digW ?? 0;
    for (const k of p.kw) {
      let a = agg.get(k);
      if (!a) {
        a = { frequency: 0, digSum: 0, bereichCounts: new Map() };
        agg.set(k, a);
      }
      a.frequency += 1;
      a.digSum += dig;
      if (p.ber) a.bereichCounts.set(p.ber, (a.bereichCounts.get(p.ber) ?? 0) + 1);
    }
  }
  return agg;
}

function dominantBereich(counts: Map<string, number>): string | null {
  let best: string | null = null;
  let max = -1;
  for (const [b, c] of counts) {
    if (c > max) {
      max = c;
      best = b;
    }
  }
  return best;
}

function makeKeywordNode(
  data: GraphData,
  id: string,
  a: KeywordAgg,
): ComputedNode {
  return {
    id: `kw:${id}`,
    kind: "keyword",
    label: data.keywords[id]?.label ?? id,
    qid: data.keywords[id]?.qid ?? null,
    frequency: a.frequency,
    bereich: dominantBereich(a.bereichCounts),
    digSum: a.digSum,
  };
}

/** Erzeugt den anzuzeigenden Graphen je nach Modus aus den gefilterten Posten. */
export function buildGraph(
  data: GraphData,
  filters: Filters,
  mode: GraphMode,
): ComputedGraph {
  const posten = filterPosten(data, filters);
  const agg = aggregateKeywords(posten);

  // Keywords, die die Mindesthaeufigkeit erfuellen
  const keptKeywords = new Set<string>();
  for (const [k, a] of agg) {
    if (a.frequency >= filters.minFrequency) keptKeywords.add(k);
  }

  const nodes: ComputedNode[] = [];
  for (const k of keptKeywords) {
    nodes.push(makeKeywordNode(data, k, agg.get(k)!));
  }

  const edges: ComputedEdge[] = [];

  if (mode === "keyword") {
    // Ko-Occurrence-Kanten: pro Posten alle Keyword-Paare zaehlen
    const pairWeights = new Map<string, number>();
    for (const p of posten) {
      const ks = p.kw.filter((k) => keptKeywords.has(k));
      if (ks.length < 2) continue;
      ks.sort();
      for (let i = 0; i < ks.length; i++) {
        for (let j = i + 1; j < ks.length; j++) {
          const key = `${ks[i]}\u0000${ks[j]}`;
          pairWeights.set(key, (pairWeights.get(key) ?? 0) + 1);
        }
      }
    }
    for (const [key, w] of pairWeights) {
      const [s, t] = key.split("\u0000");
      edges.push({ source: `kw:${s}`, target: `kw:${t}`, weight: w });
    }
  } else {
    // Bipartit: Keyword <-> Einzelplan
    const epWeights = new Map<string, number>(); // "ep|kw" -> count
    const epUsage = new Map<string, number>(); // ep -> Anzahl Posten
    const epDig = new Map<string, number>();
    for (const p of posten) {
      if (!p.ep) continue;
      const ks = p.kw.filter((k) => keptKeywords.has(k));
      if (ks.length === 0) continue;
      epUsage.set(p.ep, (epUsage.get(p.ep) ?? 0) + 1);
      epDig.set(p.ep, (epDig.get(p.ep) ?? 0) + (p.digW ?? 0));
      for (const k of ks) {
        const key = `${p.ep}\u0000${k}`;
        epWeights.set(key, (epWeights.get(key) ?? 0) + 1);
      }
    }
    // Einzelplan-Knoten
    for (const [ep, usage] of epUsage) {
      nodes.push({
        id: `ep:${ep}`,
        kind: "einzelplan",
        label: data.einzelplaene[ep]?.label ?? `Einzelplan ${ep}`,
        qid: data.einzelplaene[ep]?.qid ?? null,
        frequency: usage,
        bereich: null,
        digSum: epDig.get(ep) ?? 0,
      });
    }
    for (const [key, w] of epWeights) {
      const [ep, k] = key.split("\u0000");
      edges.push({ source: `ep:${ep}`, target: `kw:${k}`, weight: w });
    }
  }

  return { nodes, edges };
}

export interface KeywordStats {
  frequency: number;
  digSum: number;
  bereich: string | null;
  /** Akteure (Einzelplaene), absteigend nach Nutzung. */
  actors: { id: string; label: string; qid: string | null; count: number }[];
  /** Haeufigste Ko-Occurrence-Partner. */
  cooccurrences: { id: string; label: string; count: number }[];
  /** Verbundene Haushaltstitel (eindeutig, ID und Label) */
  titles: { id: string; label: string }[];
}

/** Detailstatistik fuer ein einzelnes Keyword (fuer das Detail-Panel). */
export function keywordStats(
  data: GraphData,
  filters: Filters,
  keywordId: string,
): KeywordStats {
  const posten = filterPosten(data, filters);
  let frequency = 0;
  let digSum = 0;
  const bereichCounts = new Map<string, number>();
  const actorCounts = new Map<string, number>();
  const coCounts = new Map<string, number>();
  const titleSet = new Set<string>();

  for (const p of posten) {
    if (!p.kw.includes(keywordId)) continue;
    frequency += 1;
    digSum += p.digW ?? 0;
    if (p.ber) bereichCounts.set(p.ber, (bereichCounts.get(p.ber) ?? 0) + 1);
    if (p.ep) actorCounts.set(p.ep, (actorCounts.get(p.ep) ?? 0) + 1);
    if (p.t) titleSet.add(p.t);
    for (const k of p.kw) {
      if (k === keywordId) continue;
      coCounts.set(k, (coCounts.get(k) ?? 0) + 1);
    }
  }

  const actors = [...actorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => ({
      id,
      label: data.einzelplaene[id]?.label ?? `Einzelplan ${id}`,
      qid: data.einzelplaene[id]?.qid ?? null,
      count,
    }));

  const cooccurrences = [...coCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([id, count]) => ({
      id,
      label: data.keywords[id]?.label ?? id,
      count,
    }));
    
  const titles = Array.from(titleSet).map(id => ({
    id,
    label: data.titel[id] ?? id
  }));

  return { frequency, digSum, bereich: dominantBereich(bereichCounts), actors, cooccurrences, titles };
}

export interface EinzelplanStats {
  frequency: number;
  digSum: number;
  /** Haeufigste Keywords dieses Einzelplans. */
  topKeywords: { id: string; label: string; count: number }[];
  /** Verbundene Haushaltstitel (eindeutig, ID und Label) */
  titles: { id: string; label: string }[];
}

/** Detailstatistik fuer einen Einzelplan (fuer das Detail-Panel). */
export function einzelplanStats(
  data: GraphData,
  filters: Filters,
  einzelplanId: string,
): EinzelplanStats {
  const posten = filterPosten(data, filters);
  let frequency = 0;
  let digSum = 0;
  const kwCounts = new Map<string, number>();
  const titleSet = new Set<string>();
  for (const p of posten) {
    if (p.ep !== einzelplanId) continue;
    frequency += 1;
    digSum += p.digW ?? 0;
    if (p.t) titleSet.add(p.t);
    for (const k of p.kw) kwCounts.set(k, (kwCounts.get(k) ?? 0) + 1);
  }
  const topKeywords = [...kwCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([id, count]) => ({ id, label: data.keywords[id]?.label ?? id, count }));
    
  const titles = Array.from(titleSet).map(id => ({
    id,
    label: data.titel[id] ?? id
  }));
    
  return { frequency, digSum, topKeywords, titles };
}
