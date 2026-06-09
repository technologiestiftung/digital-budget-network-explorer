with open("src/components/FilterPanel.tsx", "r") as f:
    text = f.read()

import re
text = re.sub(
    r'<section>\s*<h2>Ansicht</h2>.*?</section>',
    r'''<section>
          <h2>Ansicht</h2>
          <div className="mode-toggle">
            <button
              className={mode === "keyword" ? "active" : ""}
              onClick={() => setMode("keyword")}>
              Keyword-Netzwerk
            </button>
            <button
              className={mode === "bipartite" ? "active" : ""}
              onClick={() => setMode("bipartite")}>
              Keyword ↔ Einzelplan
            </button>
          </div>
          
          <h2 style={{ marginTop: 16 }}>Knotengröße nach</h2>
          <div className="mode-toggle">
            <button
              className={nodeSizeMetric === "count" ? "active" : ""}
              onClick={() => setNodeSizeMetric("count")}>
              Anzahl Titel
            </button>
            <button
              className={nodeSizeMetric === "budget" ? "active" : ""}
              onClick={() => setNodeSizeMetric("budget")}>
              Budget (T€ digital)
            </button>
          </div>
        </section>''',
    text,
    flags=re.DOTALL
)

with open("src/components/FilterPanel.tsx", "w") as f:
    f.write(text)
