import re

with open("web/src/components/DetailPanel.tsx", "r") as f:
    text = f.read()

# Replace Tab Labels
text = text.replace('Nach Bereich', 'Digitalisierungsbereich')
text = text.replace('Nach Ressort', 'Einzelplan')

# Replace InfoTooltip text for "Verteilung"
# Original:
#               Verteilung
#               <InfoTooltip text={
#                 distTab === "bereich" 
#                   ? "Zeigt, in welchen übergeordneten thematischen Bereichen der Digitalisierung dieses Keyword anteilig am häufigsten vorkommt."
#                   : "Zeigt, welche Ministerien und obersten Bundesbehörden (Einzelpläne) dieses Keyword in ihren Haushaltstiteln am häufigsten verwenden."
#               } />
# New:
#               Verteilung
#               <InfoTooltip text="Zeigt die Verteilung der zugehörigen Haushaltstitel nach den verschiedenen Kategorien (Digitalisierungsbereich oder Einzelplan)." />
tooltip_pattern = r'<InfoTooltip text=\{\s*distTab === "bereich".*?\} />'
new_tooltip = '<InfoTooltip text="Zeigt die Verteilung der zugehörigen Haushaltstitel nach den verschiedenen Kategorien (Digitalisierungsbereich oder Einzelplan)." />'
text = re.sub(tooltip_pattern, new_tooltip, text, flags=re.DOTALL)

# Replace bereich-bars and actors bars with unified dist-list
# Old bereich logic:
#             {distTab === "bereich" && kwStats.bereichCounts && kwStats.bereichCounts.length > 0 && (
#               <div className="bereich-bars">
# ...
#             )}
# Old ressort logic:
#             {distTab === "ressort" && (
#               <ul className="bars" style={{ marginTop: 14 }}>
# ...
#             )}

new_distribution = """
            {distTab === "bereich" && kwStats.bereichCounts && kwStats.bereichCounts.length > 0 && (
              <div className="dist-list">
                {kwStats.bereichCounts.map((b) => {
                  const total = kwStats.bereichCounts.reduce((sum, item) => sum + item.count, 0);
                  const pct = Math.round((b.count / total) * 100);
                  return (
                    <div key={b.id} className="dist-row">
                      <div className="dist-label">
                        <span className="dist-name">{b.label}</span>
                        <span className="dist-count">{b.count}</span>
                      </div>
                      <div className="dist-bar-bg">
                        <div className="dist-bar-fill" style={{ width: `${pct}%` }} />
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
              <div className="dist-list">
                {kwStats.actors.slice(0, 10).map((a) => {
                  const total = kwStats.actors.reduce((sum, item) => sum + item.count, 0);
                  const pct = Math.round((a.count / total) * 100);
                  return (
                    <button
                      key={a.id}
                      className="dist-row clickable"
                      onClick={() => selectNode(`ep:${a.id}`)}
                    >
                      <div className="dist-label">
                        <span className="dist-name">{a.label}</span>
                        <span className="dist-count">{a.count}</span>
                      </div>
                      <div className="dist-bar-bg">
                        <div className="dist-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
"""

old_sections = r'\{distTab === "bereich" && kwStats\.bereichCounts.*?</ul>\s*\)\}'
text = re.sub(old_sections, new_distribution.strip(), text, flags=re.DOTALL)

with open("web/src/components/DetailPanel.tsx", "w") as f:
    f.write(text)
