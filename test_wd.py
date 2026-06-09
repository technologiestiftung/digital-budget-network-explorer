import json
import urllib.request
import urllib.parse

def fetch_wikidata_buckets(qids):
    if not qids: return {}
    
    # We batch in groups of 50 to avoid URI too long errors
    results = {}
    
    # Buckets:
    # org: Q43229 (org), Q3180671 (inst), Q327333 (gov agency)
    # tech: Q7397 (software), Q11660 (AI), Q8274 (computer prog), Q205315 (comp network), Q14001 (hardware)
    # infra: Q1301371 (infra), Q41136 (telecom net)
    # law: Q7748 (law), Q820655 (statute), Q748052 (strategy)
    # science: Q11862829 (academic disc), Q13442814 (scientific research)
    
    batch_size = 50
    for i in range(0, len(qids), batch_size):
        batch = qids[i:i+batch_size]
        values = " ".join([f"wd:{q}" for q in batch])
        
        query = f"""
        SELECT ?item ?bucket WHERE {{
          VALUES ?item {{ {values} }}
          ?item wdt:P31/wdt:P279* ?class .
          BIND(
            IF(?class IN (wd:Q43229, wd:Q3180671, wd:Q327333), "org",
            IF(?class IN (wd:Q7397, wd:Q11660, wd:Q8274, wd:Q205315, wd:Q14001), "tech",
            IF(?class IN (wd:Q1301371, wd:Q41136), "infra",
            IF(?class IN (wd:Q7748, wd:Q820655, wd:Q748052), "law",
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
                    # Keep the first matched bucket or prioritize
                    if qid not in results:
                        results[qid] = bucket
        except Exception as e:
            print(f"Error fetching Wikidata batch: {e}")
            
    return results

if __name__ == "__main__":
    print(fetch_wikidata_buckets(["Q30", "Q4071928"]))
