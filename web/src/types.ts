// Datenstrukturen, die exakt dem Output von preprocess_graph.py entsprechen.

export interface KeywordInfo {
  label: string;
  qid: string | null;
}

export interface EinzelplanInfo {
  label: string;
  qid: string | null;
}

export interface Posten {
  kw: string[];
  ep: string | null;
  jahr: number | null;
  ber: string | null;
  kl: string | null;
  soll: number | null;
  ist: number | null;
  digW: number | null;
}

export interface GraphData {
  meta: {
    generated: string;
    source: string;
    counts: Record<string, number>;
  };
  keywords: Record<string, KeywordInfo>;
  einzelplaene: Record<string, EinzelplanInfo>;
  bereiche: Record<string, string>;
  klassen: Record<string, string>;
  jahre: number[];
  posten: Posten[];
}

export type GraphMode = "keyword" | "bipartite";

export interface Filters {
  jahre: Set<number>;
  bereiche: Set<string>;
  klassen: Set<string>;
  einzelplaene: Set<string>;
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
  /** Dominanter Bereich (nur Keywords), fuer Einfaerbung. */
  bereich: string | null;
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
