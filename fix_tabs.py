with open("web/src/components/DetailPanel.tsx", "r") as f:
    text = f.read()

old_block = """            <h3>
              Verteilung
              <InfoTooltip text="Zeigt die Verteilung der zugehörigen Haushaltstitel nach den verschiedenen Kategorien (Digitalisierungsbereich oder Einzelplan)." />
            </h3>
            <div className="detail-tabs">
              <button 
                className={distTab === "bereich" ? "active" : ""} 
                onClick={() => setDistTab("bereich")}
              >
                Digitalisierungsbereich
              </button>
              <button 
                className={distTab === "ressort" ? "active" : ""} 
                onClick={() => setDistTab("ressort")}
              >
                Einzelplan
              </button>
            </div>"""

new_block = """            <h3>Verteilung</h3>
            <div className="detail-tabs">
              <button 
                className={distTab === "bereich" ? "active" : ""} 
                onClick={() => setDistTab("bereich")}
              >
                Digitalisierungsbereich
                <InfoTooltip text="Zeigt, in welchen thematischen Digitalisierungsbereichen (z.B. Verwaltung, Infrastruktur) dieses Keyword vorkommt." />
              </button>
              <button 
                className={distTab === "ressort" ? "active" : ""} 
                onClick={() => setDistTab("ressort")}
              >
                Einzelplan
                <InfoTooltip text="Listet die Ministerien und obersten Bundesbehörden auf, die dieses Keyword in ihren Titeln verwenden." />
              </button>
            </div>"""

text = text.replace(old_block, new_block)

with open("web/src/components/DetailPanel.tsx", "w") as f:
    f.write(text)
