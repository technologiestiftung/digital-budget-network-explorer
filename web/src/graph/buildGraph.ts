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
  const useJahr = f.jahr !== null;
  const useBer = f.bereiche.size > 0;
  const useKl = f.klassen.size > 0;
  const useEp = f.einzelplaene.size > 0;
  const useHg = f.hauptgruppen.size > 0;
  const useHf = f.hauptfunktionen.size > 0;

  return data.posten.filter((p) => {
    if (useJahr && p.jahr !== f.jahr) return false;
    if (useBer && (p.ber == null || !f.bereiche.has(p.ber))) return false;
    if (useKl && (p.kl == null || !f.klassen.has(p.kl))) return false;
    if (useEp && (p.ep == null || !f.einzelplaene.has(p.ep))) return false;
    if (useHg && (p.hg == null || !f.hauptgruppen.has(p.hg))) return false;
    if (useHf && (p.hf == null || !f.hauptfunktionen.has(p.hf))) return false;
    
    return true;
  });
}

interface KeywordAgg {
  titelIds: Set<string>;
  fallbackCount: number;
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
        a = { titelIds: new Set(), fallbackCount: 0, digSum: 0, bereichCounts: new Map() };
        agg.set(k, a);
      }
      if (p.t) {
        a.titelIds.add(p.t);
      } else {
        a.fallbackCount += 1;
      }
      a.digSum += dig;
      if (p.ber) a.bereichCounts.set(p.ber, (a.bereichCounts.get(p.ber) ?? 0) + 1);
    }
  }
  return agg;
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
    frequency: a.titelIds.size + a.fallbackCount,
    type: data.keywords[id]?.type ?? "other",
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
    const freq = a.titelIds.size + a.fallbackCount;
    if (freq >= filters.minFrequency) keptKeywords.add(k);
  }

  const nodes: ComputedNode[] = [];
  for (const k of keptKeywords) {
    nodes.push(makeKeywordNode(data, k, agg.get(k)!));
  }

  const edges: ComputedEdge[] = [];

  if (mode === "keyword") {
    // Ko-Occurrence-Kanten: Paare auf Basis von Titeln zaehlen statt Posten, 
    // um die Gewichtung konsistent zur Knotengroesse zu halten
    const titlePairs = new Map<string, Set<string>>(); // key -> Set of titelIds
    const fallbackPairs = new Map<string, number>();   // key -> count for null titles
    
    for (const p of posten) {
      const ks = p.kw.filter((k) => keptKeywords.has(k));
      if (ks.length < 2) continue;
      ks.sort();
      for (let i = 0; i < ks.length; i++) {
        for (let j = i + 1; j < ks.length; j++) {
          const key = `${ks[i]}\u0000${ks[j]}`;
          if (p.t) {
            let s = titlePairs.get(key);
            if (!s) { s = new Set(); titlePairs.set(key, s); }
            s.add(p.t);
          } else {
            fallbackPairs.set(key, (fallbackPairs.get(key) ?? 0) + 1);
          }
        }
      }
    }
    
    // Kombinieren aus Sets und Fallbacks
    const allKeys = new Set([...titlePairs.keys(), ...fallbackPairs.keys()]);
    for (const key of allKeys) {
      const w = (titlePairs.get(key)?.size ?? 0) + (fallbackPairs.get(key) ?? 0);
      const [s, t] = key.split("\u0000");
      edges.push({ source: `kw:${s}`, target: `kw:${t}`, weight: w });
    }
  } else {
    // Bipartit: Keyword <-> Einzelplan
    const epWeightsTitle = new Map<string, Set<string>>(); 
    const epWeightsFallback = new Map<string, number>(); 
    
    const epUsageTitle = new Map<string, Set<string>>(); 
    const epUsageFallback = new Map<string, number>(); 
    
    const epDig = new Map<string, number>();
    
    for (const p of posten) {
      if (!p.ep) continue;
      const ks = p.kw.filter((k) => keptKeywords.has(k));
      if (ks.length === 0) continue;
      
      if (p.t) {
        let s = epUsageTitle.get(p.ep);
        if (!s) { s = new Set(); epUsageTitle.set(p.ep, s); }
        s.add(p.t);
      } else {
        epUsageFallback.set(p.ep, (epUsageFallback.get(p.ep) ?? 0) + 1);
      }
      
      epDig.set(p.ep, (epDig.get(p.ep) ?? 0) + (p.digW ?? 0));
      for (const k of ks) {
        const key = `${p.ep}\u0000${k}`;
        if (p.t) {
           let s = epWeightsTitle.get(key);
           if (!s) { s = new Set(); epWeightsTitle.set(key, s); }
           s.add(p.t);
        } else {
           epWeightsFallback.set(key, (epWeightsFallback.get(key) ?? 0) + 1);
        }
      }
    }
    
    // Einzelplan-Knoten
    const allEps = new Set([...epUsageTitle.keys(), ...epUsageFallback.keys()]);
    for (const ep of allEps) {
      const usage = (epUsageTitle.get(ep)?.size ?? 0) + (epUsageFallback.get(ep) ?? 0);
      nodes.push({
        id: `ep:${ep}`,
        kind: "einzelplan",
        label: data.einzelplaene[ep]?.label ?? `Einzelplan ${ep}`,
        qid: data.einzelplaene[ep]?.qid ?? null,
        frequency: usage,
        type: null,
        digSum: epDig.get(ep) ?? 0,
      });
    }
    
    const allKeys = new Set([...epWeightsTitle.keys(), ...epWeightsFallback.keys()]);
    for (const key of allKeys) {
      const w = (epWeightsTitle.get(key)?.size ?? 0) + (epWeightsFallback.get(key) ?? 0);
      const [ep, k] = key.split("\u0000");
      edges.push({ source: `ep:${ep}`, target: `kw:${k}`, weight: w });
    }
  }

  return { nodes, edges };
}

export interface KeywordStats {
  frequency: number;
  digSum: number;
  bereichCounts: { id: string; label: string; count: number }[];
  /** Akteure (Einzelplaene), absteigend nach Nutzung. */
  actors: { id: string; label: string; qid: string | null; count: number }[];
  /** Haeufigste Ko-Occurrence-Partner. */
  cooccurrences: { id: string; label: string; count: number }[];
  /** Verbundene Haushaltstitel (eindeutig, ID und Label) */
  titles: { id: string; label: string }[];
  /** Die aus dem Rohtext extrahierten Wortverbindungen fuer dieses Keyword */
  phrases: { label: string; count: number }[];
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
  const phraseCounts = new Map<string, number>();
  const titleSet = new Set<string>();
  let fallbackCount = 0;

  for (const p of posten) {
    if (!p.kw.includes(keywordId)) continue;
    
    digSum += p.digW ?? 0;
    if (p.ber) bereichCounts.set(p.ber, (bereichCounts.get(p.ber) ?? 0) + 1);
    if (p.ep) actorCounts.set(p.ep, (actorCounts.get(p.ep) ?? 0) + 1);
    
    if (p.t) {
      titleSet.add(p.t);
    } else {
      fallbackCount++;
    }
    
    // Phrasen aggregieren
    if (p.phrases && p.phrases[keywordId]) {
      for (const phrase of p.phrases[keywordId]) {
        phraseCounts.set(phrase, (phraseCounts.get(phrase) ?? 0) + 1);
      }
    }
    
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

  const phrases = [...phraseCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  const bereichCountsArray = [...bereichCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => ({ id, label: data.bereiche[id] ?? id, count }));

  frequency = titleSet.size + fallbackCount;

  return { frequency, digSum, bereichCounts: bereichCountsArray, actors, cooccurrences, titles, phrases };
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
  let fallbackCount = 0;
  
  for (const p of posten) {
    if (p.ep !== einzelplanId) continue;
    
    digSum += p.digW ?? 0;
    if (p.t) {
      titleSet.add(p.t);
    } else {
      fallbackCount++;
    }
    
    for (const k of p.kw) kwCounts.set(k, (kwCounts.get(k) ?? 0) + 1);
  }
  
  frequency = titleSet.size + fallbackCount;
  
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
