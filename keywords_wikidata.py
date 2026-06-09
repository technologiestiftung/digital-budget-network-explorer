#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
keywords_wikidata.py
====================

Sucht fuer jedes Keyword des Digitalhaushalt-Datensatzes einen passenden
Wikidata-Eintrag und schreibt eine CSV mit Kandidaten + Konfidenz.

Vorgehen je Keyword:
  1. Wikidata-Suche (wbsearchentities) auf Deutsch.
  2. Falls kein Treffer: Fallback-Suche auf Englisch.
  3. Bester Treffer wird uebernommen; match_type klassifiziert die Sicherheit:
       exact  - Wikidata-Label entspricht (normalisiert) exakt dem Keyword
       fuzzy  - Treffer vorhanden, aber Label != Keyword (pruefen!)
       none   - kein Treffer

Das Skript ist WIEDERAUFNEHMBAR: Ergebnisse werden in einer JSON-Cache-Datei
gespeichert. Bei erneutem Lauf werden nur noch nicht abgefragte Keywords
nachgeholt (wichtig wegen API-Rate-Limits).

Aufruf:
  python3 keywords_wikidata.py            # Abfrage + CSV erzeugen
  python3 keywords_wikidata.py --csv-only # nur CSV aus Cache neu schreiben

Spalten der Ausgabe-CSV:
  keyword                Original-Keyword
  keyword_uri            URI der Keyword-Ressource in der TTL
  wikidata_qid           Q-ID des besten Treffers ("" falls keiner)
  wikidata_uri           Wikidata-Entitaets-URI
  wikidata_label         Label des Treffers
  wikidata_description   Kurzbeschreibung des Treffers
  match_type             exact | fuzzy | none
  search_lang            de | en  (Sprache, in der gefunden wurde)
"""

import argparse
import csv
import json
import os
import sys
import time
import unicodedata
import urllib.parse
import urllib.request

DEFAULT_BASE = "http://example.org/digitalhaushalt/"
WD_ENTITY = "http://www.wikidata.org/entity/"
CACHE_FILE = "keywords_wikidata_cache.json"
API = "https://www.wikidata.org/w/api.php"
UA = "digitalhaushalt-keyword-linking/1.0 (research; contact: example@example.org)"


def slugify(text: str) -> str:
    t = (text or "").strip().lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        t = t.replace(a, b)
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode("ascii")
    import re
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    return t or "x"


def norm(text: str) -> str:
    """Normalisiert fuer den exakten Label-Vergleich."""
    t = (text or "").strip().lower()
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode("ascii")
    return t


def read_keywords(path, delimiter):
    seen = []
    s = set()
    with open(path, encoding="utf-8") as f:
        for r in csv.DictReader(f, delimiter=delimiter):
            for k in r["keywords"].split("|"):
                k = k.strip()
                if k and k not in s:
                    s.add(k)
                    seen.append(k)
    return seen


def wd_search(query, lang, limit=5):
    params = {
        "action": "wbsearchentities",
        "search": query,
        "language": lang,
        "uselang": lang,
        "format": "json",
        "limit": limit,
        "type": "item",
    }
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.load(resp)
    return [
        {
            "qid": x["id"],
            "label": x.get("label", ""),
            "description": x.get("description", ""),
            "match": x.get("match", {}),
        }
        for x in data.get("search", [])
    ]


def wd_search_retry(query, lang, max_retries=6):
    delay = 2.0
    for attempt in range(max_retries):
        try:
            return wd_search(query, lang)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(delay)
                delay = min(delay * 1.8, 30)
                continue
            raise
        except Exception:
            time.sleep(delay)
            delay = min(delay * 1.8, 30)
    return []


def classify(keyword, candidates):
    """Waehlt besten Treffer + match_type."""
    if not candidates:
        return None, "none"
    nk = norm(keyword)
    # 1) exakter Label- oder Alias-Treffer
    for c in candidates:
        if norm(c["label"]) == nk:
            return c, "exact"
        m = c.get("match", {})
        if m.get("type") in ("label", "alias") and norm(m.get("text", "")) == nk:
            return c, "exact"
    # 2) sonst Top-Treffer als fuzzy
    return candidates[0], "fuzzy"


def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_cache(cache):
    tmp = CACHE_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=0)
    os.replace(tmp, CACHE_FILE)


def query_all(keywords, cache, sleep, fallback_en):
    todo = [k for k in keywords if k not in cache]
    print(f"Abzufragen: {len(todo)} (von {len(keywords)}; "
          f"{len(keywords) - len(todo)} bereits im Cache)", file=sys.stderr)
    for i, kw in enumerate(todo, 1):
        cands = wd_search_retry(kw, "de")
        lang = "de"
        if not cands and fallback_en:
            cands = wd_search_retry(kw, "en")
            lang = "en"
        best, mtype = classify(kw, cands)
        cache[kw] = {
            "qid": best["qid"] if best else "",
            "label": best["label"] if best else "",
            "description": best["description"] if best else "",
            "match_type": mtype,
            "search_lang": lang if best else "",
        }
        if i % 20 == 0:
            save_cache(cache)
            print(f"  ...{i}/{len(todo)} abgefragt (zuletzt: {kw!r} -> "
                  f"{cache[kw]['qid'] or '-'} [{mtype}])", file=sys.stderr)
        time.sleep(sleep)
    save_cache(cache)
    return cache


def write_csv(keywords, cache, base, out):
    base = base if base.endswith("/") else base + "/"
    with open(out, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["keyword", "keyword_uri", "wikidata_qid", "wikidata_uri",
                    "wikidata_label", "wikidata_description", "match_type",
                    "search_lang"])
        for kw in keywords:
            info = cache.get(kw, {})
            qid = info.get("qid", "")
            w.writerow([
                kw,
                f"{base}keyword/{slugify(kw)}",
                qid,
                WD_ENTITY + qid if qid else "",
                info.get("label", ""),
                info.get("description", ""),
                info.get("match_type", ""),
                info.get("search_lang", ""),
            ])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", "-i",
                    default="digitalhaushalt_transformed_with_titel_text_and_extracted_keywords.csv")
    ap.add_argument("--output", "-o", default="keywords_wikidata.csv")
    ap.add_argument("--base", default=DEFAULT_BASE)
    ap.add_argument("--delimiter", default=";")
    ap.add_argument("--sleep", type=float, default=0.6,
                    help="Pause zwischen API-Aufrufen (Sekunden).")
    ap.add_argument("--no-fallback-en", action="store_true",
                    help="Keinen englischen Fallback verwenden.")
    ap.add_argument("--csv-only", action="store_true",
                    help="Keine API-Abfrage; nur CSV aus dem Cache schreiben.")
    args = ap.parse_args()

    keywords = read_keywords(args.input, args.delimiter)
    print(f"Eindeutige Keywords: {len(keywords)}", file=sys.stderr)

    cache = load_cache()
    if not args.csv_only:
        cache = query_all(keywords, cache, args.sleep,
                          fallback_en=not args.no_fallback_en)

    write_csv(keywords, cache, args.base, args.output)

    # Statistik
    from collections import Counter
    stat = Counter(cache.get(k, {}).get("match_type", "none") for k in keywords)
    print(f"Geschrieben: {args.output}", file=sys.stderr)
    print(f"  match_type: {dict(stat)}", file=sys.stderr)


if __name__ == "__main__":
    main()
