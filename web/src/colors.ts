// Farbpalette fuer die Digitalisierungsbereiche (Einfaerbung der Keyword-Knoten
// nach dominantem Bereich). Schluessel = lokaler Name des Bereichs.
export const BEREICH_COLORS: Record<string, string> = {
  "infrastruktur": "#4e79a7",
  "digitalisierung-der-wirtschaft": "#f28e2b",
  "digitalisierung-der-oeffentlichen-verwaltung": "#59a14f",
  "digitale-kompetenzen": "#e15759",
  "digitalisierung-im-bereich-kultur-medien-zivilgesellschaft": "#b07aa1",
  "foerderung-von-forschung-und-innovation": "#76b7b2",
  "gesundheitswesen": "#ff9da7",
  "bundeswehr": "#9c755f",
  "unteilbare-ausgaben": "#bab0ac",
};

export const KEYWORD_FALLBACK_COLOR = "#9aa7b5";
export const EINZELPLAN_COLOR = "#222f3e";

export function colorForKeyword(bereich: string | null): string {
  if (bereich && BEREICH_COLORS[bereich]) return BEREICH_COLORS[bereich];
  return KEYWORD_FALLBACK_COLOR;
}
