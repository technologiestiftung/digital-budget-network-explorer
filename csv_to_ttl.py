#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
csv_to_ttl.py
=============

Wandelt den Digitalhaushalt-CSV-Datensatz in eine RDF/Turtle-Datei (.ttl) um.

Datenmodell (nutzt bestehende Vokabulare, wo moeglich):
  * schema.org           -> Beschreibung von Posten, Titeln, Organisationen
  * SKOS                 -> Keywords, Bereiche, Klassen, Gruppierungs-/Funktionenplan
  * Dublin Core Terms    -> Verknuepfung Posten <-> Keyword (dcterms:subject)
  * eigenes Mini-Vokabular (Namespace "dh:") nur dort, wo es keinen passenden
    Standardbegriff gibt (z.B. Haushaltsposten, Soll/Ist-Betraege).

Kernidee fuer den spaeteren semantischen Netzwerkgraphen:
  Jedes Keyword wird zu einer EIGENEN Entitaet (skos:Concept) und ueber
  dcterms:subject mit den Haushaltsposten verknuepft. Zusaetzlich werden
  gemeinsam auftretende Keywords ueber dh:cooccursWith (Untereigenschaft von
  skos:related) direkt miteinander verbunden -> daraus entsteht das Netzwerk.

Aufruf:
  python3 csv_to_ttl.py \
      --input digitalhaushalt_transformed_with_titel_text_and_extracted_keywords.csv \
      --output digitalhaushalt.ttl

Optionen:
  --no-cooccurrence   Keine direkten Keyword-Keyword-Kanten erzeugen.
  --base URI          Basis-URI fuer alle erzeugten Ressourcen.
"""

import argparse
import csv
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from itertools import combinations

from rdflib import Graph, Literal, Namespace, URIRef
from rdflib.namespace import DCTERMS, OWL, RDF, RDFS, SKOS, XSD

# --------------------------------------------------------------------------- #
# Namespaces / Vokabulare
# --------------------------------------------------------------------------- #
SCHEMA = Namespace("https://schema.org/")

DEFAULT_BASE = "http://example.org/digitalhaushalt/"

# Spaltennamen der 9 Digitalisierungs-Bereichs-Flags -> sprechendes Label
BEREICH_FLAGS = {
    "_1_infra":            "Infrastruktur",
    "_2_dig_wirtschaft":   "Digitalisierung der Wirtschaft",
    "_3_dig_verwaltung":   "Digitalisierung der oeffentlichen Verwaltung",
    "_4_dig_kompetenzen":  "Digitale Kompetenzen",
    "_5_dig_kultur":       "Digitalisierung im Bereich Kultur / Medien / Zivilgesellschaft",
    "_6_forschung_inno":   "Foerderung von Forschung und Innovation",
    "_7_gesundheitswesen": "Gesundheitswesen",
    "_8_bundeswehr":       "Bundeswehr",
    "_9_unteilbare_ausg":  "Unteilbare Ausgaben",
}


# --------------------------------------------------------------------------- #
# Hilfsfunktionen
# --------------------------------------------------------------------------- #
def slugify(text: str) -> str:
    """Erzeugt einen URI-tauglichen, lesbaren Slug aus beliebigem Text."""
    t = (text or "").strip().lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        t = t.replace(a, b)
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode("ascii")
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    return t or "x"


class SlugRegistry:
    """Vergibt stabile, eindeutige Slugs und merkt sich Text -> URI."""

    def __init__(self, namespace: Namespace):
        self.ns = namespace
        self.by_text: dict[str, URIRef] = {}
        self._used: dict[str, str] = {}  # slug -> text (zur Kollisionsaufloesung)

    def uri(self, text: str) -> URIRef:
        if text in self.by_text:
            return self.by_text[text]
        base = slugify(text)
        slug = base
        i = 2
        while slug in self._used and self._used[slug] != text:
            slug = f"{base}-{i}"
            i += 1
        self._used[slug] = text
        ref = self.ns[slug]
        self.by_text[text] = ref
        return ref


def dec_literal(value: str):
    """Dezimalwert als xsd:decimal-Literal (Originalstring -> keine Rundung)."""
    v = (value or "").strip()
    if not v:
        return None
    try:
        float(v)  # nur Validierung
    except ValueError:
        return None
    return Literal(v, datatype=XSD.decimal)


def clean(value: str) -> str:
    return (value or "").strip()


# --------------------------------------------------------------------------- #
# Hauptlogik
# --------------------------------------------------------------------------- #
def build_graph(rows, base: str, cooccurrence: bool, wikidata_links=None,
                keyword_wikidata=None) -> Graph:
    g = Graph()

    DH = Namespace(base + "ontology#")
    NS_POSTEN = Namespace(base + "posten/")
    NS_TITEL = Namespace(base + "titel/")
    NS_KEYWORD = Namespace(base + "keyword/")
    NS_BEREICH = Namespace(base + "bereich/")
    NS_KLASSE = Namespace(base + "digi-klasse/")
    NS_EP = Namespace(base + "einzelplan/")
    NS_KAPITEL = Namespace(base + "kapitel/")
    NS_GRUPPE = Namespace(base + "gruppe/")
    NS_FUNKTION = Namespace(base + "funktion/")
    NS_SCHEME = Namespace(base + "scheme/")

    # Prefixe binden (huebsche Turtle-Ausgabe)
    g.bind("dh", DH)
    g.bind("schema", SCHEMA)
    g.bind("skos", SKOS)
    g.bind("dcterms", DCTERMS)
    g.bind("rdfs", RDFS)
    g.bind("owl", OWL)
    g.bind("posten", NS_POSTEN)
    g.bind("titel", NS_TITEL)
    g.bind("keyword", NS_KEYWORD)
    g.bind("bereich", NS_BEREICH)
    g.bind("klasse", NS_KLASSE)
    g.bind("einzelplan", NS_EP)
    g.bind("kapitel", NS_KAPITEL)
    g.bind("gruppe", NS_GRUPPE)
    g.bind("funktion", NS_FUNKTION)

    L = lambda s: Literal(s, lang="de")

    # ---------------------------------------------------------------- #
    # 1) Ontologie-Kopf + eigene Begriffe definieren
    # ---------------------------------------------------------------- #
    onto = URIRef(base + "ontology")
    g.add((onto, RDF.type, OWL.Ontology))
    g.add((onto, RDFS.label, L("Digitalhaushalt-Vokabular")))
    g.add((onto, RDFS.comment, L(
        "Leichtgewichtiges Vokabular fuer den Digitalhaushalt-Datensatz. "
        "Erweitert schema.org, SKOS und Dublin Core Terms.")))

    # Klassen
    for cls, label, comment, parent in [
        (DH.Haushaltstitel, "Haushaltstitel",
         "Ein Haushaltstitel (identifiziert durch seine Titel-ID), der ueber "
         "mehrere Haushaltsjahre hinweg fortgeschrieben wird.", SCHEMA.Intangible),
        (DH.Haushaltsposten, "Haushaltsposten",
         "Auspraegung eines Haushaltstitels in einem konkreten Haushaltsjahr "
         "mit Soll-/Ist-Betraegen und Klassifikation.", SCHEMA.Intangible),
    ]:
        g.add((cls, RDF.type, RDFS.Class))
        g.add((cls, RDF.type, OWL.Class))
        g.add((cls, RDFS.label, L(label)))
        g.add((cls, RDFS.comment, L(comment)))
        if parent:
            g.add((cls, RDFS.subClassOf, parent))

    # Datentyp-Eigenschaften (Betraege in Tausend Euro)
    money_props = {
        DH.soll:            "Soll-Betrag (geplant)",
        DH.ist:             "Ist-Betrag (tatsaechlich)",
        DH.sollDigitalEng:  "Digitaler Anteil des Soll-Betrags (enge Abgrenzung)",
        DH.sollDigitalWeit: "Digitaler Anteil des Soll-Betrags (weite Abgrenzung)",
        DH.istDigitalEng:   "Digitaler Anteil des Ist-Betrags (enge Abgrenzung)",
        DH.istDigitalWeit:  "Digitaler Anteil des Ist-Betrags (weite Abgrenzung)",
    }
    for prop, label in money_props.items():
        g.add((prop, RDF.type, RDF.Property))
        g.add((prop, RDF.type, OWL.DatatypeProperty))
        g.add((prop, RDFS.label, L(label)))
        g.add((prop, RDFS.comment, L(label + " \u2013 Angabe in Tausend Euro (1.000 \u20ac).")))
        g.add((prop, RDFS.range, XSD.decimal))

    g.add((DH.jahr, RDF.type, RDF.Property))
    g.add((DH.jahr, RDF.type, OWL.DatatypeProperty))
    g.add((DH.jahr, RDFS.label, L("Haushaltsjahr")))
    g.add((DH.jahr, RDFS.range, XSD.gYear))

    # Objekt-Eigenschaften
    obj_props = {
        DH.einzelplan: ("Einzelplan", "Zustaendiger Einzelplan (Ressort/Ministerium).", SCHEMA.GovernmentOrganization),
        DH.kapitel:    ("Kapitel", "Haushaltskapitel des Postens.", SKOS.Concept),
        DH.gruppe:     ("Gruppierung", "Gruppierung (Gruppierungsplan) des Postens.", SKOS.Concept),
        DH.funktion:   ("Funktion", "Funktion (Funktionenplan) des Postens.", SKOS.Concept),
        DH.digiKlasse: ("Digitalisierungsklasse", "Methodische Einstufung der Digitalisierung.", SKOS.Concept),
        DH.bereich:    ("Digitalisierungsbereich", "Thematischer Digitalisierungsbereich.", SKOS.Concept),
    }
    for prop, (label, comment, rng) in obj_props.items():
        g.add((prop, RDF.type, RDF.Property))
        g.add((prop, RDF.type, OWL.ObjectProperty))
        g.add((prop, RDFS.label, L(label)))
        g.add((prop, RDFS.comment, L(comment)))
        g.add((prop, RDFS.range, rng))
        g.add((prop, RDFS.domain, DH.Haushaltsposten))

    # Co-Occurrence-Eigenschaft fuer das Keyword-Netzwerk
    g.add((DH.cooccursWith, RDF.type, RDF.Property))
    g.add((DH.cooccursWith, RDF.type, OWL.ObjectProperty))
    g.add((DH.cooccursWith, RDF.type, OWL.SymmetricProperty))
    g.add((DH.cooccursWith, RDFS.subPropertyOf, SKOS.related))
    g.add((DH.cooccursWith, RDFS.label, L("tritt gemeinsam auf mit")))
    g.add((DH.cooccursWith, RDFS.comment, L(
        "Verbindet zwei Keywords, die mindestens einmal im selben Haushaltsposten "
        "vorkommen. Bildet die Kanten des semantischen Keyword-Netzwerks.")))

    # ---------------------------------------------------------------- #
    # 2) Concept Schemes anlegen
    # ---------------------------------------------------------------- #
    SCHEME_KEYWORD = NS_SCHEME["keywords"]
    SCHEME_BEREICH = NS_SCHEME["digitalisierungsbereiche"]
    SCHEME_KLASSE = NS_SCHEME["digitalisierungsklassen"]
    SCHEME_GRUPPE = NS_SCHEME["gruppierungsplan"]
    SCHEME_FUNKTION = NS_SCHEME["funktionenplan"]
    SCHEME_KAPITEL = NS_SCHEME["kapitel"]

    scheme_labels = {
        SCHEME_KEYWORD: "Digitalhaushalt \u2013 Schlagwoerter (Keywords)",
        SCHEME_BEREICH: "Digitalhaushalt \u2013 Digitalisierungsbereiche",
        SCHEME_KLASSE: "Digitalhaushalt \u2013 Digitalisierungsklassen",
        SCHEME_GRUPPE: "Gruppierungsplan",
        SCHEME_FUNKTION: "Funktionenplan",
        SCHEME_KAPITEL: "Haushaltskapitel",
    }
    for scheme, label in scheme_labels.items():
        g.add((scheme, RDF.type, SKOS.ConceptScheme))
        g.add((scheme, RDFS.label, L(label)))
        g.add((scheme, DCTERMS.title, L(label)))

    # Dataset-Metadaten
    dataset = URIRef(base + "dataset")
    g.add((dataset, RDF.type, SCHEMA.Dataset))
    g.add((dataset, SCHEMA.name, L("Digitalhaushalt des Bundes")))
    g.add((dataset, DCTERMS.title, L("Digitalhaushalt des Bundes")))
    g.add((dataset, SCHEMA.description, L(
        "Haushaltsposten des Bundes mit digitalem Ausgabenanteil, klassifiziert "
        "nach Bereichen und angereichert mit extrahierten Schlagwoertern.")))

    # ---------------------------------------------------------------- #
    # 3) Registries fuer Konzepte
    # ---------------------------------------------------------------- #
    kw_reg = SlugRegistry(NS_KEYWORD)
    ber_reg = SlugRegistry(NS_BEREICH)

    # Bereichs-Konzepte vorab anlegen (feste Menge)
    bereich_uri = {}
    for col, label in BEREICH_FLAGS.items():
        uri = ber_reg.uri(label)
        bereich_uri[col] = uri
        g.add((uri, RDF.type, SKOS.Concept))
        g.add((uri, SKOS.prefLabel, L(label)))
        g.add((uri, SKOS.inScheme, SCHEME_BEREICH))
        g.add((uri, SKOS.topConceptOf, SCHEME_BEREICH))
        g.add((SCHEME_BEREICH, SKOS.hasTopConcept, uri))
        g.add((uri, SKOS.notation, Literal(col)))

    # Merker fuer bereits angelegte Konzepte/Knoten
    seen = set()
    titel_name = {}          # id -> (jahr, titel_text)  (juengster Eintrag)
    titel_posten = defaultdict(list)
    keyword_pairs = set()    # Mengen ungeordneter Keyword-Paare

    # ---------------------------------------------------------------- #
    # 4) Zeilen verarbeiten
    # ---------------------------------------------------------------- #
    for r in rows:
        tid = clean(r["id"])
        jahr = clean(r["jahr"])
        if not tid or not jahr:
            continue

        posten = NS_POSTEN[f"{tid}_{jahr}"]
        titel = NS_TITEL[tid]

        # --- Haushaltsposten ---
        g.add((posten, RDF.type, DH.Haushaltsposten))
        g.add((posten, DCTERMS.isPartOf, titel))
        g.add((posten, SCHEMA.identifier, Literal(tid)))
        g.add((posten, DH.jahr, Literal(jahr, datatype=XSD.gYear)))

        titel_text = clean(r["titel_text"])
        if titel_text:
            # Titel-Texte sind teils sehr lang -> als schema:description,
            # gekuerzte Variante als Name.
            g.add((posten, SCHEMA.description, L(titel_text)))
            short = titel_text if len(titel_text) <= 120 else titel_text[:117] + "..."
            g.add((posten, SCHEMA.name, L(short)))

        # Betraege
        for prop, col in [
            (DH.soll, "soll"),
            (DH.ist, "ist"),
            (DH.sollDigitalEng, "digi_soll_eng"),
            (DH.sollDigitalWeit, "digi_soll_weit"),
            (DH.istDigitalEng, "digi_ist_eng"),
            (DH.istDigitalWeit, "digi_ist_weit"),
        ]:
            lit = dec_literal(r.get(col, ""))
            if lit is not None:
                g.add((posten, prop, lit))

        # --- Einzelplan (Organisation) ---
        ep = clean(r["einzelplan"])
        ep_text = clean(r["einzelplan-text"])
        if ep:
            ep_uri = NS_EP[ep]
            if ("ep", ep) not in seen:
                seen.add(("ep", ep))
                g.add((ep_uri, RDF.type, SCHEMA.GovernmentOrganization))
                g.add((ep_uri, SCHEMA.identifier, Literal(ep)))
                if ep_text:
                    g.add((ep_uri, SCHEMA.name, L(ep_text)))
                    g.add((ep_uri, RDFS.label, L(ep_text)))
            g.add((posten, DH.einzelplan, ep_uri))

        # --- Kapitel (Concept) ---
        kap = clean(r["kapitel"])
        kap_text = clean(r["kapitel-text"])
        if kap:
            kap_uri = NS_KAPITEL[kap]
            if ("kap", kap) not in seen:
                seen.add(("kap", kap))
                g.add((kap_uri, RDF.type, SKOS.Concept))
                g.add((kap_uri, SKOS.notation, Literal(kap)))
                g.add((kap_uri, SKOS.inScheme, SCHEME_KAPITEL))
                if kap_text:
                    g.add((kap_uri, SKOS.prefLabel, L(kap_text)))
                if ep:
                    g.add((kap_uri, DCTERMS.isPartOf, NS_EP[ep]))
            g.add((posten, DH.kapitel, kap_uri))

        # --- Gruppierung mit Hierarchie (Gruppe -> Obergruppe -> Hauptgruppe) ---
        add_hierarchy(
            g, posten, DH.gruppe, NS_GRUPPE, SCHEME_GRUPPE, seen, L,
            code=clean(r["gruppe"]),
            texts={
                "leaf": clean(r["gruppe-text"]),
                "mid": clean(r["obergruppe-text"]),
                "top": clean(r["hauptgruppe-text"]),
            },
            mid_len=2, top_len=1, prefix="g",
        )

        # --- Funktion mit Hierarchie (Funktion -> Oberfunktion -> Hauptfunktion) ---
        add_hierarchy(
            g, posten, DH.funktion, NS_FUNKTION, SCHEME_FUNKTION, seen, L,
            code=clean(r["funktion"]),
            texts={
                "leaf": clean(r["funktion-text"]),
                "mid": clean(r["oberfunktion-text"]),
                "top": clean(r["hauptfunktion-text"]),
            },
            mid_len=2, top_len=1, prefix="f",
        )

        # --- Digitalisierungsklasse (Concept) ---
        dk = clean(r["digi_klasse"])
        dk_text = clean(r["digi_klasse-text"])
        if dk:
            dk_uri = NS_KLASSE[dk]
            if ("dk", dk) not in seen:
                seen.add(("dk", dk))
                g.add((dk_uri, RDF.type, SKOS.Concept))
                g.add((dk_uri, SKOS.notation, Literal(dk)))
                g.add((dk_uri, SKOS.inScheme, SCHEME_KLASSE))
                g.add((dk_uri, SKOS.topConceptOf, SCHEME_KLASSE))
                g.add((SCHEME_KLASSE, SKOS.hasTopConcept, dk_uri))
                if dk_text:
                    g.add((dk_uri, SKOS.prefLabel, L(dk_text)))
            g.add((posten, DH.digiKlasse, dk_uri))

        # --- Digitalisierungsbereiche (9 Flags) ---
        for col, uri in bereich_uri.items():
            if clean(r.get(col, "")) == "1":
                g.add((posten, DH.bereich, uri))

        # --- Keywords (das Herzstueck des Netzwerks) ---
        kws = sorted({k.strip() for k in r["keywords"].split("|") if k.strip()})
        kw_uris = []
        for kw in kws:
            uri = kw_reg.uri(kw)
            kw_uris.append(uri)
            if ("kw", kw) not in seen:
                seen.add(("kw", kw))
                g.add((uri, RDF.type, SKOS.Concept))
                g.add((uri, SKOS.prefLabel, L(kw)))
                g.add((uri, SKOS.inScheme, SCHEME_KEYWORD))
                # Wikidata-Verknuepfung (nur gepruefte exact-Treffer)
                if keyword_wikidata:
                    info = keyword_wikidata.get(kw)
                    if info and info.get("qid"):
                        WD = Namespace("http://www.wikidata.org/entity/")
                        g.bind("wd", WD)
                        wd_uri = WD[info["qid"]]
                        g.add((uri, SKOS.exactMatch, wd_uri))
                        if info.get("label"):
                            g.add((wd_uri, RDFS.label, Literal(info["label"], lang="de")))
            # Posten <-> Keyword
            g.add((posten, DCTERMS.subject, uri))

        # Co-Occurrence-Paare sammeln
        if cooccurrence and len(kw_uris) >= 2:
            for a, b in combinations(sorted(kw_uris, key=str), 2):
                keyword_pairs.add((a, b))

        # Titel-Gruppierung
        titel_posten[tid].append(posten)
        if tid not in titel_name or jahr >= titel_name[tid][0]:
            titel_name[tid] = (jahr, titel_text)

    # ---------------------------------------------------------------- #
    # 5) Haushaltstitel (Gruppierungsknoten) ausgeben
    # ---------------------------------------------------------------- #
    for tid, posten_list in titel_posten.items():
        titel = NS_TITEL[tid]
        g.add((titel, RDF.type, DH.Haushaltstitel))
        g.add((titel, SCHEMA.identifier, Literal(tid)))
        name = titel_name.get(tid, (None, ""))[1]
        if name:
            short = name if len(name) <= 120 else name[:117] + "..."
            g.add((titel, RDFS.label, L(short)))
            g.add((titel, SCHEMA.name, L(short)))
        for p in posten_list:
            g.add((titel, SCHEMA.hasPart, p))

    # ---------------------------------------------------------------- #
    # 6) Keyword-Netzwerkkanten ausgeben
    # ---------------------------------------------------------------- #
    for a, b in keyword_pairs:
        g.add((a, DH.cooccursWith, b))
        g.add((b, DH.cooccursWith, a))

    # ---------------------------------------------------------------- #
    # 7) Wikidata-Verknuepfung der Einzelplaene
    #    - echte Institution        -> owl:sameAs
    #    - nur thematische Beziehung -> rdfs:seeAlso
    # ---------------------------------------------------------------- #
    if wikidata_links:
        WD = Namespace("http://www.wikidata.org/entity/")
        g.bind("wd", WD)
        for ep, info in wikidata_links.items():
            qid = info.get("qid")
            if not qid:
                continue
            ep_uri = NS_EP[ep]
            # Nur verknuepfen, wenn der Einzelplan im Graphen existiert
            if (ep_uri, RDF.type, SCHEMA.GovernmentOrganization) not in g:
                continue
            wd_uri = WD[qid]
            if info.get("thematic"):
                g.add((ep_uri, RDFS.seeAlso, wd_uri))
            else:
                g.add((ep_uri, OWL.sameAs, wd_uri))
            if info.get("label"):
                g.add((wd_uri, RDFS.label, Literal(info["label"], lang="de")))

    return g


def add_hierarchy(g, posten, link_prop, ns, scheme, seen, L,
                  code, texts, mid_len, top_len, prefix):
    """Legt eine 3-stufige SKOS-Hierarchie an (Blatt -> Mitte -> Spitze)."""
    if not code:
        return

    leaf = ns[code]
    mid_code = code[:mid_len]
    top_code = code[:top_len]
    mid = ns[mid_code]
    top = ns[top_code]

    # Spitze (Hauptgruppe / Hauptfunktion)
    if (prefix, "top", top_code) not in seen:
        seen.add((prefix, "top", top_code))
        g.add((top, RDF.type, SKOS.Concept))
        g.add((top, SKOS.notation, Literal(top_code)))
        g.add((top, SKOS.inScheme, scheme))
        g.add((top, SKOS.topConceptOf, scheme))
        g.add((scheme, SKOS.hasTopConcept, top))
        if texts.get("top"):
            g.add((top, SKOS.prefLabel, L(texts["top"])))

    # Mitte (Obergruppe / Oberfunktion)
    if (prefix, "mid", mid_code) not in seen:
        seen.add((prefix, "mid", mid_code))
        g.add((mid, RDF.type, SKOS.Concept))
        g.add((mid, SKOS.notation, Literal(mid_code)))
        g.add((mid, SKOS.inScheme, scheme))
        if texts.get("mid"):
            g.add((mid, SKOS.prefLabel, L(texts["mid"])))
        if mid_code != top_code:
            g.add((mid, SKOS.broader, top))
            g.add((top, SKOS.narrower, mid))

    # Blatt (Gruppe / Funktion)
    if (prefix, "leaf", code) not in seen:
        seen.add((prefix, "leaf", code))
        g.add((leaf, RDF.type, SKOS.Concept))
        g.add((leaf, SKOS.notation, Literal(code)))
        g.add((leaf, SKOS.inScheme, scheme))
        if texts.get("leaf"):
            g.add((leaf, SKOS.prefLabel, L(texts["leaf"])))
        if code != mid_code:
            g.add((leaf, SKOS.broader, mid))
            g.add((mid, SKOS.narrower, leaf))

    g.add((posten, link_prop, leaf))


def load_wikidata_links(path):
    """Liest die Einzelplan->Wikidata-Zuordnung aus der Mapping-CSV.

    Erwartete Spalten: einzelplan, wikidata_qid, wikidata_label, hinweis.
    Ein nicht-leerer Hinweis kennzeichnet eine rein thematische Beziehung
    (-> rdfs:seeAlso statt owl:sameAs).
    """
    links = {}
    try:
        with open(path, encoding="utf-8") as f:
            for r in csv.DictReader(f):
                ep = (r.get("einzelplan") or "").strip()
                qid = (r.get("wikidata_qid") or "").strip()
                if not ep or not qid:
                    continue
                links[ep] = {
                    "qid": qid,
                    "label": (r.get("wikidata_label") or "").strip(),
                    "thematic": bool((r.get("hinweis") or "").strip()),
                }
    except FileNotFoundError:
        print(f"Hinweis: Wikidata-Mapping {path} nicht gefunden \u2013 "
              f"Einzelplaene werden ohne Wikidata-Links erzeugt.", file=sys.stderr)
        return None
    return links


def load_keyword_wikidata(path, only_exact=True):
    """Liest Keyword->Wikidata-Zuordnung. Standardmaessig nur match_type=exact.

    Erwartete Spalten: keyword, wikidata_qid, wikidata_label, match_type.
    """
    links = {}
    try:
        with open(path, encoding="utf-8") as f:
            for r in csv.DictReader(f):
                kw = (r.get("keyword") or "").strip()
                qid = (r.get("wikidata_qid") or "").strip()
                mtype = (r.get("match_type") or "").strip()
                if not kw or not qid:
                    continue
                if only_exact and mtype != "exact":
                    continue
                links[kw] = {"qid": qid,
                             "label": (r.get("wikidata_label") or "").strip()}
    except FileNotFoundError:
        print(f"Hinweis: Keyword-Wikidata-Mapping {path} nicht gefunden \u2013 "
              f"Keywords werden ohne Wikidata-Links erzeugt.", file=sys.stderr)
        return None
    return links


def main():
    ap = argparse.ArgumentParser(description="Digitalhaushalt-CSV -> Turtle (.ttl)")
    ap.add_argument("--input", "-i",
                    default="digitalhaushalt_transformed_with_titel_text_and_extracted_keywords.csv")
    ap.add_argument("--output", "-o", default="digitalhaushalt.ttl")
    ap.add_argument("--base", default=DEFAULT_BASE,
                    help="Basis-URI fuer erzeugte Ressourcen.")
    ap.add_argument("--delimiter", default=";", help="CSV-Trennzeichen.")
    ap.add_argument("--no-cooccurrence", action="store_true",
                    help="Keine direkten Keyword-Keyword-Kanten erzeugen.")
    ap.add_argument("--wikidata", default="einzelplaene_wikidata.csv",
                    help="CSV mit Einzelplan->Wikidata-Zuordnung.")
    ap.add_argument("--keyword-wikidata", default="keywords_wikidata.csv",
                    help="CSV mit Keyword->Wikidata-Zuordnung.")
    ap.add_argument("--keyword-all-matches", action="store_true",
                    help="Auch fuzzy-Treffer verknuepfen (Standard: nur exact).")
    args = ap.parse_args()

    base = args.base if args.base.endswith("/") else args.base + "/"

    with open(args.input, encoding="utf-8") as f:
        rows = list(csv.DictReader(f, delimiter=args.delimiter))
    print(f"Eingelesen: {len(rows)} Zeilen aus {args.input}", file=sys.stderr)

    wikidata_links = load_wikidata_links(args.wikidata)
    if wikidata_links:
        print(f"Wikidata-Mapping: {len(wikidata_links)} Einzelplaene aus {args.wikidata}",
              file=sys.stderr)

    keyword_wikidata = load_keyword_wikidata(
        args.keyword_wikidata, only_exact=not args.keyword_all_matches)
    if keyword_wikidata:
        print(f"Keyword-Wikidata-Mapping: {len(keyword_wikidata)} Keywords "
              f"({'alle' if args.keyword_all_matches else 'nur exact'}) "
              f"aus {args.keyword_wikidata}", file=sys.stderr)

    g = build_graph(rows, base=base, cooccurrence=not args.no_cooccurrence,
                    wikidata_links=wikidata_links,
                    keyword_wikidata=keyword_wikidata)
    print(f"Graph erzeugt: {len(g)} Tripel", file=sys.stderr)

    g.serialize(destination=args.output, format="turtle")
    print(f"Geschrieben: {args.output}", file=sys.stderr)


if __name__ == "__main__":
    main()
