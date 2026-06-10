#!/usr/bin/env python3
"""
Preprocessing: digitalhaushalt.ttl -> web/public/data/graph.json

Wandelt den grossen Turtle-Datensatz (~100k Zeilen) EINMALIG in eine kompakte
JSON-Struktur um, die der Browser direkt laden kann. Der Browser muss damit nie
das vollstaendige Turtle parsen -> schneller Start, performante Filterung.

Ausgabe-Struktur (graph.json):
{
  "meta": { "generated": ..., "counts": {...} },
  "keywords":    { "<id>": { "label": str, "qid": "Q..."|null } },
  "einzelplaene":{ "<id>": { "label": str, "qid": "Q..."|null } },
  "bereiche":    { "<id>": "label" },
  "klassen":     { "<id>": "label" },
  "jahre":       [2019, 2021, ...],
  "posten": [
     { "kw": ["id1","id2"], "ep": "10", "jahr": 2021,
       "ber": "digitalisierung-der-wirtschaft", "kl": "7",
       "soll": 15280.0, "ist": 8051.12, "digW": 1207.66 }
  ]
}

Die Co-Occurrence-Kanten und Keyword-Haeufigkeiten werden NICHT vorberechnet,
sondern im Browser aus den (gefilterten) Posten abgeleitet. So wirken alle
Filter live auf Knoten, Kanten und Gewichte.
"""

from __future__ import annotations

import json
import os
import re
import urllib.request
import urllib.parse
from datetime import datetime, timezone

from rdflib import Graph, Namespace, RDF
from rdflib.namespace import SKOS, OWL, DCTERMS, RDFS
import re

BASE = "http://example.org/digitalhaushalt/"
DH = Namespace(BASE + "ontology#")
SCHEMA = Namespace("https://schema.org/")
WD = "http://www.wikidata.org/entity/"

KEYWORD_PREFIX = BASE + "keyword/"
EINZELPLAN_PREFIX = BASE + "einzelplan/"
BEREICH_PREFIX = BASE + "bereich/"
KLASSE_PREFIX = BASE + "digi-klasse/"
POSTEN_PREFIX = BASE + "posten/"

HERE = os.path.dirname(os.path.abspath(__file__))
TTL_PATH = os.path.join(HERE, "digitalhaushalt.ttl")
OUT_DIR = os.path.join(HERE, "web", "public", "data")
OUT_PATH = os.path.join(OUT_DIR, "graph.json")


def local_name(uri: str) -> str:
    """Letztes Pfad-/Fragment-Segment einer URI."""
    s = str(uri)
    if "#" in s:
        s = s.rsplit("#", 1)[-1]
    return s.rsplit("/", 1)[-1]


def qid_from(uri) -> str | None:
    s = str(uri)
    if s.startswith(WD):
        return s[len(WD):]
    return None


def first_label(g: Graph, subj) -> str | None:
    for pred in (SKOS.prefLabel, SCHEMA.name, RDFS.label):
        val = g.value(subj, pred)
        if val is not None:
            return str(val)
    return None


def extract_phrases(text: str) -> list[str]:
    """Extrahiert eingeklammerte Begriffe wie [{{Digital]e} Infrastruktur} als 'Digitale Infrastruktur'."""
    if not text:
        return []
    tokens = text.split()
    results = []
    current = []
    bracket_level = 0
    for w in tokens:
        opens = w.count('[') + w.count('{')
        closes = w.count(']') + w.count('}')
        if opens > 0 or closes > 0 or bracket_level > 0:
            current.append(w)
        bracket_level += opens - closes
        if bracket_level <= 0 and current:
            raw = " ".join(current)
            clean = re.sub(r'[\[\]{}]', '', raw).strip('.,:;()')
            if clean:
                results.append(clean)
            current = []
            bracket_level = 0
    return results


def fetch_wikidata_buckets(qids: list[str]) -> dict[str, str]:
    if not qids: return {}
    print(f"  Frage {len(qids)} fehlende QIDs bei Wikidata SPARQL ab...")
    results = {}
    batch_size = 60
    for i in range(0, len(qids), batch_size):
        batch = qids[i:i+batch_size]
        values = " ".join([f"wd:{q}" for q in batch])
        query = f"""
        SELECT ?item ?bucket WHERE {{
          VALUES ?item {{ {values} }}
          ?item wdt:P31/wdt:P279* ?class .
          BIND(
            IF(?class IN (wd:Q43229, wd:Q3180671, wd:Q327333), "org",
            IF(?class IN (wd:Q7397, wd:Q11660, wd:Q8274, wd:Q205315, wd:Q14001, wd:Q11012, wd:Q68), "tech",
            IF(?class IN (wd:Q1301371, wd:Q41136, wd:Q211111), "infra",
            IF(?class IN (wd:Q7748, wd:Q820655, wd:Q748052, wd:Q17013853), "law",
            IF(?class IN (wd:Q11862829, wd:Q13442814), "science",
            "none")))))
            AS ?bucket)
          FILTER(?bucket != "none")
        }}
        """
        url = "https://query.wikidata.org/sparql?query=" + urllib.parse.quote(query) + "&format=json"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 DigitalBudget/1.0'})
        try:
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
                for r in data['results']['bindings']:
                    qid = r['item']['value'].split('/')[-1]
                    bucket = r['bucket']['value']
                    if qid not in results:
                        results[qid] = bucket
        except Exception as e:
            print(f"  Warnung: SPARQL Batch fehlgeschlagen: {e}")
            
    return results

def main() -> None:
    print(f"Lade Turtle: {TTL_PATH}")
    g = Graph()
    g.parse(TTL_PATH, format="turtle")
    print(f"  {len(g)} Tripel geladen.")

    keywords: dict[str, dict] = {}
    einzelplaene: dict[str, dict] = {}
    titel: dict[str, str] = {}
    titel_beschreibung: dict[str, str] = {}
    bereiche: dict[str, str] = {}
    klassen: dict[str, str] = {}
    hauptgruppen: dict[str, str] = {}
    hauptfunktionen: dict[str, str] = {}
    jahre: set[int] = set()
    posten: list[dict] = []

    # --- Hierarchy Helper ---
    broader_map = {}
    for s, p, o in g.triples((None, SKOS.broader, None)):
        broader_map[str(s)] = str(o)

    def get_top_level(concept_uri: str) -> str:
        curr = concept_uri
        while curr in broader_map:
            curr = broader_map[curr]
        return curr

    # Load all concepts for labels
    concept_labels = {}
    for s in g.subjects(RDF.type, SKOS.Concept):
        concept_labels[str(s)] = first_label(g, s) or local_name(s)

    # --- Haushaltstitel ---
    for s in g.subjects(RDF.type, DH.Haushaltstitel):
        tid = local_name(s)
        label = first_label(g, s) or tid
        titel[tid] = label

    # Anzahl Haushaltstitel (fortgeschriebene Titel ueber mehrere Jahre)
    titel_count = len(titel)

    # --- Keywords (skos:Concept im keyword-Namespace) ---
    for s in g.subjects(RDF.type, SKOS.Concept):
        su = str(s)
        if not su.startswith(KEYWORD_PREFIX):
            continue
        kid = local_name(su)
        label = g.value(s, SKOS.prefLabel)
        qid = None
        # skos:exactMatch -> Wikidata QID des Keywords
        for m in g.objects(s, SKOS.exactMatch):
            q = qid_from(m)
            if q:
                qid = q
                break
        keywords[kid] = {
            "label": str(label) if label is not None else kid,
            "qid": qid,
        }

    # --- Einzelplaene (schema:GovernmentOrganization) ---
    for s in g.subjects(RDF.type, SCHEMA.GovernmentOrganization):
        eid = local_name(s)
        qid = None
        for m in g.objects(s, OWL.sameAs):
            q = qid_from(m)
            if q:
                qid = q
                break
        einzelplaene[eid] = {
            "label": first_label(g, s) or eid,
            "qid": qid,
        }

    # --- Wikidata Buckets auflösen ---
    cache_path = os.path.join(HERE, "wikidata_type_cache.json")
    wd_cache = {}
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                wd_cache = json.load(f)
        except Exception:
            pass

    qids_to_fetch = []
    for kid, info in keywords.items():
        qid = info.get("qid")
        if qid and qid not in wd_cache:
            qids_to_fetch.append(qid)

    if qids_to_fetch:
        new_buckets = fetch_wikidata_buckets(qids_to_fetch)
        # Für QIDs ohne Treffer "other" speichern, um nicht nochmal zu fragen
        for q in qids_to_fetch:
            wd_cache[q] = new_buckets.get(q, "other")
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(wd_cache, f, indent=2)

    # Buckets ins Keyword-Objekt schreiben
    for kid, info in keywords.items():
        qid = info.get("qid")
        info["type"] = wd_cache.get(qid, "other") if qid else "other"

    # --- Posten (dh:Haushaltsposten) ---
    for s in g.subjects(RDF.type, DH.Haushaltsposten):
        kw = [
            local_name(o)
            for o in g.objects(s, DCTERMS.subject)
            if str(o).startswith(KEYWORD_PREFIX)
        ]

        ep_obj = g.value(s, DH.einzelplan)
        ep = local_name(ep_obj) if ep_obj is not None else None

        ber_obj = g.value(s, DH.bereich)
        ber = None
        if ber_obj is not None:
            ber = local_name(ber_obj)
            if ber not in bereiche:
                bereiche[ber] = first_label(g, ber_obj) or ber

        kl_obj = g.value(s, DH.digiKlasse)
        kl = None
        if kl_obj is not None:
            kl = local_name(kl_obj)
            # "Nicht digital" (Klasse 0) komplett ausschliessen
            if kl == "0":
                continue
            if kl not in klassen:
                klassen[kl] = first_label(g, kl_obj) or kl

        # --- Gruppe & Hauptgruppe ---
        grp_obj = g.value(s, DH.gruppe)
        hg = None
        if grp_obj is not None:
            hg_uri = get_top_level(str(grp_obj))
            hg = local_name(hg_uri)
            if hg not in hauptgruppen:
                hauptgruppen[hg] = concept_labels.get(hg_uri, hg)

        # --- Funktion & Hauptfunktion ---
        fun_obj = g.value(s, DH.funktion)
        hf = None
        if fun_obj is not None:
            hf_uri = get_top_level(str(fun_obj))
            hf = local_name(hf_uri)
            if hf not in hauptfunktionen:
                hauptfunktionen[hf] = concept_labels.get(hf_uri, hf)

        jahr_obj = g.value(s, DH.jahr)
        jahr = None
        if jahr_obj is not None:
            try:
                jahr = int(str(jahr_obj)[:4])
                jahre.add(jahr)
            except ValueError:
                pass

        titel_obj = g.value(s, DCTERMS.isPartOf)
        t_id = local_name(titel_obj) if titel_obj is not None else None

        desc = g.value(s, SCHEMA.description)
        desc_text = str(desc) if desc else ""
        phrases = extract_phrases(desc_text) if desc else []
        
        # Store full description text for titel (first posten wins)
        if t_id and desc_text and t_id not in titel_beschreibung:
            titel_beschreibung[t_id] = desc_text
        
        # Ordne die gefundenen Phrasen den Keywords des Postens zu
        # Einfacher Heuristik: Eine Phrase gehört zu einem Keyword, 
        # wenn der Label des Keywords als Teilstring in der Phrase vorkommt.
        kw_phrases = {}
        for k in kw:
            lbl = keywords.get(k, {}).get("label", "").lower()
            if not lbl: continue
            matched = [p for p in phrases if lbl in p.lower() or k.lower() in p.lower()]
            if matched:
                kw_phrases[k] = list(set(matched)) # deduplicate

        def num(pred):
            v = g.value(s, pred)
            try:
                return round(float(v), 3) if v is not None else None
            except (TypeError, ValueError):
                return None

        rec = {
            "t": t_id,
            "kw": kw,
            "phrases": kw_phrases,
            "ep": ep,
            "jahr": jahr,
            "ber": ber,
            "kl": kl,
            "hg": hg,
            "hf": hf,
            "soll": num(DH.soll),
            "ist": num(DH.ist),
            "digW": num(DH.istDigitalWeit),
            "sollEng": num(DH.sollDigitalEng),
            "istEng": num(DH.istDigitalEng),
        }
        posten.append(rec)

    out = {
        "meta": {
            "generated": datetime.now(timezone.utc).isoformat(),
            "source": "digitalhaushalt.ttl",
            "counts": {
                "keywords": len(keywords),
                "einzelplaene": len(einzelplaene),
                "titel": titel_count,
                "bereiche": len(bereiche),
                "klassen": len(klassen),
                "hauptgruppen": len(hauptgruppen),
                "hauptfunktionen": len(hauptfunktionen),
                "posten": len(posten),
            },
        },
        "keywords": keywords,
        "einzelplaene": einzelplaene,
        "titel": titel,
        "titel_beschreibung": titel_beschreibung,
        "bereiche": bereiche,
        "klassen": klassen,
        "hauptgruppen": hauptgruppen,
        "hauptfunktionen": hauptfunktionen,
        "jahre": sorted(jahre),
        "posten": posten,
    }

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = os.path.getsize(OUT_PATH) / 1024
    print(f"Geschrieben: {OUT_PATH} ({size_kb:.1f} KB)")
    print("  Counts:", out["meta"]["counts"])
    # Keywords mit / ohne QID (fuer Wikidata-Anreicherung relevant)
    with_qid = sum(1 for v in keywords.values() if v["qid"])
    ep_with_qid = sum(1 for v in einzelplaene.values() if v["qid"])
    print(f"  Keywords mit Wikidata-QID: {with_qid}/{len(keywords)}")
    print(f"  Einzelplaene mit Wikidata-QID: {ep_with_qid}/{len(einzelplaene)}")


if __name__ == "__main__":
    main()
