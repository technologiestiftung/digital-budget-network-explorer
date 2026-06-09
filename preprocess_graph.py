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
from datetime import datetime, timezone

from rdflib import Graph, Namespace, RDF
from rdflib.namespace import SKOS, OWL, DCTERMS, RDFS

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


def main() -> None:
    print(f"Lade Turtle: {TTL_PATH}")
    g = Graph()
    g.parse(TTL_PATH, format="turtle")
    print(f"  {len(g)} Tripel geladen.")

    keywords: dict[str, dict] = {}
    einzelplaene: dict[str, dict] = {}
    bereiche: dict[str, str] = {}
    klassen: dict[str, str] = {}
    jahre: set[int] = set()
    posten: list[dict] = []

    # Anzahl Haushaltstitel (fortgeschriebene Titel ueber mehrere Jahre)
    titel_count = sum(1 for _ in g.subjects(RDF.type, DH.Haushaltstitel))

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
            if kl not in klassen:
                klassen[kl] = first_label(g, kl_obj) or kl

        jahr_obj = g.value(s, DH.jahr)
        jahr = None
        if jahr_obj is not None:
            try:
                jahr = int(str(jahr_obj)[:4])
                jahre.add(jahr)
            except ValueError:
                pass

        def num(pred):
            v = g.value(s, pred)
            try:
                return round(float(v), 3) if v is not None else None
            except (TypeError, ValueError):
                return None

        rec = {
            "kw": kw,
            "ep": ep,
            "jahr": jahr,
            "ber": ber,
            "kl": kl,
            "soll": num(DH.soll),
            "ist": num(DH.ist),
            "digW": num(DH.istDigitalWeit),
        }
        posten.append(rec)

    out = {
        "meta": {
            "generated": datetime.now(timezone.utc).isoformat(),
            "source": "digitalhaushalt.ttl",
            "counts": {
                "keywords": len(keywords),
                "einzelplaene": len(einzelplaene),
                "bereiche": len(bereiche),
                "klassen": len(klassen),
                "posten": len(posten),
                "titel": titel_count,
            },
        },
        "keywords": keywords,
        "einzelplaene": einzelplaene,
        "bereiche": bereiche,
        "klassen": klassen,
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
