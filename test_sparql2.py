import urllib.request
import urllib.parse
import json

query = """
SELECT ?path WHERE {
  wd:Q28549308 wdt:P31/wdt:P279* ?path .
}
"""

url = "https://query.wikidata.org/sparql?query=" + urllib.parse.quote(query) + "&format=json"

req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 DigitalBudget/1.0'})
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        for r in data['results']['bindings']:
            print(r['path']['value'])
except Exception as e:
    print(e)
