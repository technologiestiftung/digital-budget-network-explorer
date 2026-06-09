import urllib.request
import urllib.parse
import json

qids = ["Q30", "Q4071928", "Q131470986", "Q1048818", "Q137462100", "Q68", "Q28549308", "Q1489497", "Q11012", "Q919597"]
values = " ".join([f"wd:{q}" for q in qids])

query = f"""
SELECT ?item ?bucket WHERE {{
  VALUES ?item {{ {values} }}
  ?item wdt:P31/wdt:P279* ?class .
  BIND(
    IF(?class IN (wd:Q43229, wd:Q3180671, wd:Q327333, wd:Q4830453), "org",
    IF(?class IN (wd:Q7397, wd:Q11660, wd:Q8274, wd:Q205315, wd:Q166142, wd:Q383088, wd:Q68), "tech",
    IF(?class IN (wd:Q1301371, wd:Q14001, wd:Q41136, wd:Q1489497), "infra",
    IF(?class IN (wd:Q7748, wd:Q820655, wd:Q748052, wd:Q13406323, wd:Q17013853), "law",
    IF(?class IN (wd:Q11862829, wd:Q13442814, wd:Q13406323, wd:Q11862829), "science",
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
            print(r['item']['value'], "->", r['bucket']['value'])
except Exception as e:
    print(e)
