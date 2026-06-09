with open("web/src/components/DetailPanel.tsx", "r") as f:
    text = f.read()

import re

# Add imports
text = text.replace(
    'import { fetchWikidata, type WikidataInfo } from "../services/wikidata";',
    'import { fetchWikidata, type WikidataInfo } from "../services/wikidata";\nimport InfoTooltip from "./InfoTooltip";'
)

# Add state
text = text.replace(
    '  const selectNode = useStore((s) => s.selectNode);',
    '  const selectNode = useStore((s) => s.selectNode);\n  const [distTab, setDistTab] = useState<"bereich" | "ressort">("bereich");\n\n  useEffect(() => setDistTab("bereich"), [selectedNodeId]);'
)

# Replace sections
old_sections = r'\{kwStats\.bereichCounts && kwStats\.bereichCounts\.length > 0 && \(\s*<section>\s*<h3>Verteilung nach Digitalisierungsbereich</h3>.*?</section>\s*\)\}\s*\{kwStats\.phrases && kwStats\.phrases\.length > 0 && \(\s*<section className="phrases-section">.*?</section>\s*\)\}\s*<section>\s*<h3>Akteure \(Einzelpläne\)</h3>\s*<ul className="bars">\s*\{kwStats\.actors\.slice\(0, 10\)\.map\(\(a\) => \(.*?</ul>\s*</section>'

new_sections = """
          <section className="distribution-section">
            <h3>
              Verteilung
              <InfoTooltip text={
                distTab === "bereich" 
                  ? "Zeigt, in welchen übergeordneten thematischen Bereichen der Digitalisierung dieses Keyword anteilig am häufigsten vorkommt."
                  : "Zeigt, welche Ministerien und obersten Bundesbehörden (Einzelpläne) dieses Keyword in ihren Haushaltstiteln am häufigsten verwenden."
              } />
            </h3>
            <div className="detail-tabs">
              <button 
                className={distTab === "bereich" ? "active" : ""} 
                onClick={() => setDistTab("bereich")}
              >
                Nach Bereich
              </button>
              <button 
                className={distTab === "ressort" ? "active" : ""} 
                onClick={() => setDistTab("ressort")}
              >
                Nach Ressort
              </button>
            </div>

            {distTab === "bereich" && kwStats.bereichCounts && kwStats.bereichCounts.length > 0 && (
              <div className="bereich-bars">
                {kwStats.bereichCounts.map((b) => {
                  const total = kwStats.bereichCounts.reduce((sum, item) => sum + item.count, 0);
                  const pct = Math.round((b.count / total) * 100);
                  return (
                    <div key={b.id} className="bereich-bar-row">
                      <div className="bereich-bar-label">
                        <span>{b.label}</span>
                        <span className="bereich-bar-percent">{b.count}</span>
                      </div>
                      <div className="bereich-bar-bg">
                        <div 
                          className="bereich-bar-fill" 
                          style={{ width: `${pct}%`, background: "var(--accent)" }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {distTab === "bereich" && (!kwStats.bereichCounts || kwStats.bereichCounts.length === 0) && (
              <p className="muted small" style={{ marginTop: 10 }}>Keine Daten verfügbar.</p>
            )}

            {distTab === "ressort" && (
              <ul className="bars" style={{ marginTop: 14 }}>
                {kwStats.actors.slice(0, 10).map((a) => (
                  <li key={a.id}>
                    <button
                      className="link-row"
                      onClick={() => selectNode(`ep:${a.id}`)}>
                      <span className="row-label">{a.label}</span>
                      <span className="row-count">{a.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {kwStats.phrases && kwStats.phrases.length > 0 && (
            <section className="phrases-section">
              <h3>Wortverbindungen im Text</h3>
              <ul className="phrase-list">
                {kwStats.phrases.map((p) => (
                  <li key={p.label}>
                    {p.label} <span className="muted small">×{p.count}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}"""

text = re.sub(old_sections, new_sections, text, flags=re.DOTALL)

with open("web/src/components/DetailPanel.tsx", "w") as f:
    f.write(text)
