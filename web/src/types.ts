// Datenstrukturen, die exakt dem Output von preprocess_graph.py entsprechen.

export interface KeywordInfo {
  label: string;
  qid: string | null;
  type: "tech" | "org" | "law" | "infra" | "science" | "other";
}

export interface EinzelplanInfo {
  label: string;
  qid: string | null;
}

export interface Posten {
  t: string | null; // titel id
  kw: string[];
  phrases?: Record<string, string[]>; // k -> liste von Phrasen
  ep: string | null;
  jahr: number | null;
  ber: string | null;
  kl: string | null;
  hg: string | null;
  hf: string | null;
  soll: number | null;
  ist: number | null;
  digW: number | null;
  sollEng: number | null;
  istEng: number | null;
}

export interface GraphData {
  meta: {
    generated: string;
    source: string;
    counts: Record<string, number>;
  };
  keywords: Record<string, KeywordInfo>;
  einzelplaene: Record<string, EinzelplanInfo>;
  titel: Record<string, string>;
  titel_beschreibung: Record<string, string>;
  bereiche: Record<string, string>;
  klassen: Record<string, string>;
  hauptgruppen: Record<string, string>;
  hauptfunktionen: Record<string, string>;
  jahre: number[];
  posten: Posten[];
}

export type GraphMode = "keyword" | "bipartite";

export interface Filters {
  jahr: number | null;
  bereiche: Set<string>;
  klassen: Set<string>;
  einzelplaene: Set<string>;
  hauptgruppen: Set<string>;
  hauptfunktionen: Set<string>;
  minFrequency: number;
  /** Nur digitale Posten (digW > 0) beruecksichtigen. */
  nurDigital: boolean;
}

// Knoten-Typen im aufbereiteten Graphen
export type NodeKind = "keyword" | "einzelplan";

export interface ComputedNode {
  id: string;
  kind: NodeKind;
  label: string;
  qid: string | null;
  /** Haeufigkeit = Anzahl (gefilterter) Posten, in denen das Keyword vorkommt. */
  frequency: number;
  /** Wikidata Kategorie des Keywords. */
  type: string | null;
  /** Summe digitaler Ausgaben (weite Abgrenzung) ueber die Posten. */
  digSum: number;
}

export interface ComputedEdge {
  source: string;
  target: string;
  weight: number;
}

export interface ComputedGraph {
  nodes: ComputedNode[];
  edges: ComputedEdge[];
}
