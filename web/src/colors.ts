// Farbpalette fuer die Wikidata-Kategorien (Buckets)
export const TYPE_COLORS: Record<string, string> = {
  "tech": "#2f6fed",       // Technologie / IT (Blau)
  "org": "#f28e2b",        // Organisation / Akteur (Orange)
  "law": "#e15759",        // Recht / Strategie (Rot)
  "infra": "#59a14f",      // Infrastruktur (Gruen)
  "science": "#b07aa1",    // Wissenschaft (Lila)
  "other": "#9aa7b5",      // Sonstiges (Grau)
};

export const TYPE_LABELS: Record<string, string> = {
  "tech": "Technologie / Software",
  "org": "Organisation / Akteur",
  "law": "Recht / Strategie",
  "infra": "Infrastruktur / Hardware",
  "science": "Forschung / Methode",
  "other": "Sonstiges",
};

export const EINZELPLAN_COLOR = "#222f3e";

export function colorForType(type: string | null): string {
  if (type && TYPE_COLORS[type]) return TYPE_COLORS[type];
  return TYPE_COLORS["other"];
}
