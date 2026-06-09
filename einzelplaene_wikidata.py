#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
einzelplaene_wikidata.py
========================

Erzeugt eine CSV mit der Zuordnung jedes Einzelplans (Ressort/Verfassungsorgan)
zur passenden Wikidata-Entitaet.

Die Wikidata-QIDs wurden ueber die Wikidata-API (wbsearchentities) recherchiert
und manuell gegen die Bezeichnungen im Datensatz geprueft.

Spalten der Ausgabe:
  einzelplan        Nummer des Einzelplans
  einzelplan_text   Bezeichnung im Datensatz
  einzelplan_uri    URI der Einzelplan-Ressource in der TTL (Basis-URI anpassbar)
  wikidata_qid      Q-ID des Wikidata-Items (leer, falls kein passendes Item)
  wikidata_uri      Konkatenierte Wikidata-Entitaets-URI
  wikidata_label    Bezeichnung des Wikidata-Items
  hinweis           Anmerkung zur Zuordnung (z.B. eingeschraenkte Eignung)
"""

import argparse
import csv

DEFAULT_BASE = "http://example.org/digitalhaushalt/"
WD_ENTITY = "http://www.wikidata.org/entity/"

# ep -> (QID, Wikidata-Label, Hinweis)
WIKIDATA = {
    "1":  ("Q470470",    "Bundespräsidialamt", ""),
    "2":  ("Q154797",    "Deutscher Bundestag", ""),
    "3":  ("Q146138",    "Bundesrat", ""),
    "4":  ("Q317027",    "Bundeskanzleramt", ""),
    "5":  ("Q56034",     "Auswärtiges Amt", ""),
    "6":  ("Q502698",    "Bundesministerium des Innern", ""),
    "7":  ("Q498251",    "Bundesministerium der Justiz und für Verbraucherschutz", ""),
    "8":  ("Q499118",    "Bundesministerium der Finanzen", ""),
    "9":  ("Q488589",    "Bundesministerium für Wirtschaft und Energie", ""),
    "10": ("Q699656",    "Bundesministerium für Landwirtschaft, Ernährung und Heimat", ""),
    "11": ("Q491578",    "Bundesministerium für Arbeit und Soziales", ""),
    "12": ("Q491637",    "Bundesministerium für Verkehr", ""),
    "14": ("Q493353",    "Bundesministerium der Verteidigung", ""),
    "15": ("Q491566",    "Bundesministerium für Gesundheit", ""),
    "16": ("Q493344",    "Bundesministerium für Umwelt, Klimaschutz, Naturschutz und nukleare Sicherheit", ""),
    "17": ("Q166020",    "Bundesministerium für Bildung, Familie, Senioren, Frauen und Jugend", ""),
    "19": ("Q56025",     "Bundesverfassungsgericht", ""),
    "20": ("Q56033",     "Bundesrechnungshof", ""),
    "21": ("Q1005821",   "Die Bundesbeauftragte für den Datenschutz und die Informationsfreiheit", ""),
    "22": ("Q106676433", "Unabhängiger Kontrollrat", ""),
    "23": ("Q684357",    "Bundesministerium für wirtschaftliche Zusammenarbeit und Entwicklung", ""),
    "24": ("Q133894806", "Bundesministerium für Digitales und Staatsmodernisierung", ""),
    "25": ("Q110021824", "Bundesministerium für Wohnen, Stadtentwicklung und Bauwesen", ""),
    "30": ("Q492234",    "Bundesministerium für Forschung, Technologie und Raumfahrt", ""),
    "32": ("Q2325345",   "Staatsverschuldung Deutschlands",
           "Kein eigenes Organ – thematische Zuordnung (Einzelplan = Bundesschuld)."),
    "60": ("", "",
           "Sammeltitel ohne eigenstaendige Institution – kein passendes Wikidata-Item."),
}


def read_einzelplaene(path, delimiter):
    """Liest Einzelplan-Nummer -> Bezeichnung aus dem Quelldatensatz."""
    texts = {}
    with open(path, encoding="utf-8") as f:
        for r in csv.DictReader(f, delimiter=delimiter):
            ep = r["einzelplan"].strip()
            t = r["einzelplan-text"].strip()
            if ep and ep not in texts and t:
                texts[ep] = t
    return texts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", "-i",
                    default="digitalhaushalt_transformed_with_titel_text_and_extracted_keywords.csv")
    ap.add_argument("--output", "-o", default="einzelplaene_wikidata.csv")
    ap.add_argument("--base", default=DEFAULT_BASE)
    ap.add_argument("--delimiter", default=";")
    args = ap.parse_args()

    base = args.base if args.base.endswith("/") else args.base + "/"
    texts = read_einzelplaene(args.input, args.delimiter)

    with open(args.output, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["einzelplan", "einzelplan_text", "einzelplan_uri",
                    "wikidata_qid", "wikidata_uri", "wikidata_label", "hinweis"])
        for ep in sorted(texts, key=lambda x: int(x)):
            qid, label, hint = WIKIDATA.get(ep, ("", "", "nicht zugeordnet"))
            wd_uri = WD_ENTITY + qid if qid else ""
            w.writerow([
                ep,
                texts[ep],
                f"{base}einzelplan/{ep}",
                qid,
                wd_uri,
                label,
                hint,
            ])
    print(f"Geschrieben: {args.output} ({len(texts)} Einzelpläne)")


if __name__ == "__main__":
    main()
