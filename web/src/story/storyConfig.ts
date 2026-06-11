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
    note: '"Software" ist in 2025 das meistgenutzte Schlagwort, das zur Beschreibung von Digitalisierungsvorhaben genutzt wird. Ganze 24 Bundesinstitutionen nutzten diesen Querschnittsbegriff auf die eine oder andere Art und Weise.',
  },
  {
    id: "7",
    type: "set",
    ids: ["hate-aid", "normenkontrollrat"],
    label: "Hate Aid",
    title: "Welche Begriffe sind einmalig oder sehr spezifisch?",
    note: 'Neben großen Querschnittsbegriffen gibt es auch sehr spezifische Vorhaben. "Hate Aid" ist beispielsweise ein konkretes Schlagwort, das durch einen Titel eines einzigen Ministeriums finanziert wird.',
  },
  {
    ids: ["kuenstliche-intelligenz", "blockchain"],
    id: "kuenstliche-intelligenz",
    type: "set",
    label: "Künstliche Intelligenz & Blockchain",
    title: "Wie entwickeln sich Trends über die Zeit?",
    note: "Die thematische Konjunktur wandelt sich: Noch vor wenigen Jahren erfuhr die Blockchain-Technologie große Aufmerksamkeit und wurde ressortübergreifend gefördert. Im aktuellen Haushalt für 2025 wird der Begriff nur noch von einem einzigen Ministerium im Haushalt erwähnt. Künstliche Intelligenz hat dagegen einen beispiellosen Aufstieg erlebt.",
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
    note: 'Ein einziger Haushaltstitel enthält häufig gleich mehrere Themen. Moderne Verwaltung, Robotik und Datenkompetenz. Das sind alles Themenbereiche, die gleichzeitig mit dem Schlagwort "Künstliche Intelligenz" in Titeln genannt werden.',
  },
];

/** Ministerien-Beispiele (Screen 4). IDs = Einzelplan-Nummern. */
export const STORY_MINISTRIES: { epId: string; short: string }[] = [
  { epId: "6", short: "BMI" },
  { epId: "30", short: "BMBF" },
  { epId: "9", short: "BMWK" },
  { epId: "24", short: "BMDS" },
];
