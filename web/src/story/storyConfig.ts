// Story-Bausteine: echte Keywords/Ministerien aus dem Datensatz.

/** Narrative Keyword-Kette (Screen 3). Lokale Keyword-IDs aus graph.json. */
export const STORY_CHAIN: { id: string; label: string; note: string }[] = [
  {
    id: "digitalisierung",
    label: "Digitalisierung",
    note: "Der Ausgangspunkt – das häufigste übergreifende Thema.",
  },
  {
    id: "kuenstliche-intelligenz",
    label: "Künstliche Intelligenz",
    note: "KI taucht quer durch Ressorts und Programme auf.",
  },
  {
    id: "cloud",
    label: "Cloud",
    note: "Infrastruktur, auf der digitale Dienste aufbauen.",
  },
  {
    id: "datenraum",
    label: "Datenraum",
    note: "Wo Daten geteilt werden – die nächste Stufe.",
  },
];

/** Ministerien-Beispiele (Screen 4). IDs = Einzelplan-Nummern. */
export const STORY_MINISTRIES: { epId: string; short: string }[] = [
  { epId: "6", short: "BMI" },
  { epId: "30", short: "BMBF" },
  { epId: "9", short: "BMWK" },
  { epId: "24", short: "BMDS" },
];
