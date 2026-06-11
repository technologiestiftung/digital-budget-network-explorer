// Farbpalette fuer die Wikidata-Kategorien (Buckets)
export const TYPE_COLORS: Record<string, string> = {
  tech: "#DCE14B",
  org: "#7F7BED",
  law: "#FBD8F2",
  infra: "#6ECDF5",
  science: "#FB7A68",
  other: "#41B496",
};

export const TYPE_LABELS: Record<string, string> = {
  tech: "Technologie / Software",
  org: "Organisation / Akteur",
  law: "Recht / Strategie",
  infra: "Infrastruktur / Hardware",
  science: "Forschung / Methode",
  other: "Sonstiges",
};

export const EINZELPLAN_COLOR = "#000000";

export function colorForType(type: string | null): string {
  if (type && TYPE_COLORS[type]) return TYPE_COLORS[type];
  return TYPE_COLORS["other"];
}
