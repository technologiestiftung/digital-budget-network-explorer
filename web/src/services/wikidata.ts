// Live-Anreicherung von Knoten mit Kontextinformationen aus Wikidata.
// Genutzt werden die QIDs aus dem Datensatz (owl:sameAs bzw. skos:exactMatch).
// Ergebnisse werden in localStorage gecacht, damit wiederholte Klicks und
// erneute Sitzungen ohne Netzwerkzugriff auskommen.

export interface WikidataInfo {
  qid: string;
  label: string | null;
  description: string | null;
  /** Direkt nutzbare Bild-URL (Wikimedia Commons, skaliert) oder null. */
  imageUrl: string | null;
  /** Link zur Wikidata-Seite. */
  url: string;
  /** Link zum deutschen Wikipedia-Artikel (falls vorhanden). */
  wikipediaUrl: string | null;
  /** Instanz von (P31) - direkte Typen */
  instanceOf: { id: string; label: string }[];
  /** Unterklasse von (P279) */
  subclassOf: { id: string; label: string }[];
}

const CACHE_PREFIX = "wd:";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 Tage

interface CacheEntry {
  ts: number;
  data: WikidataInfo;
}

function readCache(qid: string): WikidataInfo | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + qid);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() - entry.ts > CACHE_TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(qid: string, data: WikidataInfo): void {
  try {
    const entry: CacheEntry = { ts: Date.now(), data };
    localStorage.setItem(CACHE_PREFIX + qid, JSON.stringify(entry));
  } catch {
    // localStorage voll/blockiert -> still ignorieren
  }
}

function commonsImageUrl(filename: string, width = 320): string {
  // Special:FilePath liefert die Datei aus und unterstuetzt Skalierung via width.
  const name = filename.replace(/ /g, "_");
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
    name,
  )}?width=${width}`;
}

/**
 * Holt Beschreibung, Label, Bild (P18) und ggf. den deutschen Wikipedia-Link
 * zu einer QID. CORS ist auf der Wikidata-API aktiviert (origin=*).
 */
export async function fetchWikidata(qid: string): Promise<WikidataInfo> {
  const cached = readCache(qid);
  if (cached) return cached;

  const params = new URLSearchParams({
    action: "wbgetentities",
    ids: qid,
    props: "labels|descriptions|claims|sitelinks/urls",
    languages: "de|en",
    sitefilter: "dewiki",
    format: "json",
    origin: "*",
  });
  const url = `https://www.wikidata.org/w/api.php?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wikidata-Anfrage fehlgeschlagen (${res.status})`);
  const json = await res.json();
  const entity = json?.entities?.[qid];

  const pick = (obj: Record<string, { value: string }> | undefined): string | null => {
    if (!obj) return null;
    return obj.de?.value ?? obj.en?.value ?? null;
  };

  const label = pick(entity?.labels);
  const description = pick(entity?.descriptions);

  let imageUrl: string | null = null;
  const p18 = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  if (typeof p18 === "string") {
    imageUrl = commonsImageUrl(p18);
  }

  const wikipediaUrl: string | null = entity?.sitelinks?.dewiki?.url ?? null;

  // P31 (Instance of) and P279 (Subclass of)
  function extractClaims(prop: string): { id: string; label: string }[] {
    const claims = entity?.claims?.[prop] ?? [];
    return claims
      .map((c: any) => c?.mainsnak?.datavalue?.value)
      .filter((v: any) => typeof v === "object" && v.id)
      .map((v: any) => ({ id: v.id, label: v.id })); // will resolve labels below
  }
  let instanceOf = extractClaims("P31");
  let subclassOf = extractClaims("P279");
  
  // Batch-resolve labels for all class IDs
  const allIds = [...instanceOf.map((x) => x.id), ...subclassOf.map((x) => x.id)];
  if (allIds.length > 0) {
    try {
      const labelParams = new URLSearchParams({
        action: "wbgetentities",
        ids: allIds.join("|"),
        props: "labels",
        languages: "de|en",
        format: "json",
        origin: "*",
      });
      const labelUrl = "https://www.wikidata.org/w/api.php?" + labelParams.toString();
      const labelRes = await fetch(labelUrl);
      const labelJson = await labelRes.json();
      const entities = labelJson?.entities ?? {};
      const resolveLabel = (id: string): string => {
        const ent = entities[id];
        if (!ent) return id;
        return ent.labels?.de?.value ?? ent.labels?.en?.value ?? id;
      };
      instanceOf = instanceOf.map((x) => ({ ...x, label: resolveLabel(x.id) }));
      subclassOf = subclassOf.map((x) => ({ ...x, label: resolveLabel(x.id) }));
    } catch { /* silently fall back to IDs */ }
  }

  const info: WikidataInfo = {
    qid,
    label,
    description,
    imageUrl,
    url: `https://www.wikidata.org/wiki/${qid}`,
    wikipediaUrl,
    instanceOf,
    subclassOf,
  };
  writeCache(qid, info);
  return info;
}
