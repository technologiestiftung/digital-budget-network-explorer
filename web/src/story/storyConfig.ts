// Story-Bausteine: echte Keywords/Ministerien aus dem Datensatz.

/** Narrative Keyword-Kette (Screen 3). Lokale Keyword-IDs aus graph.json. */
export const STORY_CHAIN: {
  id: string;
  type: "kw" | "ep" | "set";
  ids?: string[];
  label: string;
  note: string;
  title?: string;
}[] = [
  {
    id: "software",
    type: "kw",
    label: "Software",
    title: "Welche Begriffe prägen den Digitalhaushalt?",
    note: '"Software" ist in 2025 das meistgenutzte Schlagwort, das zur Beschreibung von Digitalisierungsvorhaben genutzt wird. 24 von 26 Bundesinstitutionen nutzen diesen Querschnittsbegriff.',
  },
  {
    id: "7",
    type: "set",
    ids: ["hate-aid", "normenkontrollrat"],
    label: "Hate Aid",
    title: "Welche Begriffe sind einmalig oder sehr spezifisch?",
    note: 'Neben großen Querschnittsbegriffen gibt es auch sehr spezifische Vorhaben. "Hate Aid" ist beispielsweise ein konkretes Schlagwort, das durch den Titel eines einzigen Ministeriums finanziert wird.',
  },
  {
    id: "blockchain",
    type: "kw",
    label: "Blockchain",
    title: "Wie entwickeln sich Trends über die Zeit?",
    note: "Die thematische Konjunktur wandelt sich: Noch vor wenigen Jahren erfuhr die Blockchain-Technologie große Aufmerksamkeit und wurde ressortübergreifend gefördert. Im aktuellen Haushalt für 2025 wird der Begriff nur noch von einem einzigen Ministerium im Haushalt erwähnt.",
  },
  {
    id: "kuenstliche-intelligenz",
    type: "kw",
    label: "Künstliche Intelligenz",
    title: "Wie entwickeln sich Trends über die Zeit?",
    note: "Künstliche Intelligenz (KI) hat dagegen einen beispiellosen Aufstieg erlebt. Während das Thema 2019 nur von ganz wenigen Ministerien im Haushalt verankert war, ist KI heute omnipräsent und wird von einer breiten Mehrheit der Ressorts als zentraler Posten finanziert.",
  },
  {
    id: "ki-cluster",
    type: "set",
    ids: [
      "kuenstliche-intelligenz",
      "moderne-verwaltung",
      "robotik",
      "datenkompetenz",
    ],
    label: "Verbundene Themen",
    title: "Welche Themen stehen oft miteinander in Verbindung?",
    note: "Ein einziger Haushaltstitel enthält häufig gleich mehrere Themen. Moderne Verwaltung, Robotik und Datenkompetenz. Das sind alles Themenbereiche, die gleichzeitig mit dem Schlagwort 'Künstliche Intelligenz' in Titeln genannt",
  },
];

/** Ministerien-Beispiele (Screen 4). IDs = Einzelplan-Nummern. */
export const STORY_MINISTRIES: { epId: string; short: string }[] = [
  { epId: "6", short: "BMI" },
  { epId: "30", short: "BMBF" },
  { epId: "9", short: "BMWK" },
  { epId: "24", short: "BMDS" },
];
