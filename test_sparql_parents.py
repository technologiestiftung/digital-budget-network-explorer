import urllib.request
import urllib.parse
import json

qids = ["Q2539"] # Machine Learning
query = """
SELECT ?propLabel ?val ?valLabel WHERE {
  VALUES ?item { wd:Q2539 }
  { ?item wdt:P31 ?val . BIND("Instanz von" AS ?propLabel) }
  UNION
  { ?item wdt:P279 ?val . BIND("Unterklasse von" AS ?propLabel) }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en". }
}
"""
url = "https://query.wikidata.org/sparql?query=" + urllib.parse.quote(query) + "&format=json"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        for r in data['results']['bindings']:
            print(f"{r['propLabel']['value']}: {r['valLabel']['value']} ({r['val']['value']})")
except Exception as e:
    print(e)
