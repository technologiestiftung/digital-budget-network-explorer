import { useStore } from "../store";

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="info-icon-wrapper" onClick={(e) => e.preventDefault()}>
      <svg viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
      </svg>
      <span className="info-tooltip">{text}</span>
    </span>
  );
}

export default function FilterPanel() {
  const data = useStore((s) => s.data);
  const filters = useStore((s) => s.filters);
  const mode = useStore((s) => s.mode);
  const nodeSizeMetric = useStore((s) => s.nodeSizeMetric);
  const search = useStore((s) => s.search);
  const setMode = useStore((s) => s.setMode);
  const setNodeSizeMetric = useStore((s) => s.setNodeSizeMetric);
  const setJahr = useStore((s) => s.setJahr);
  const toggleSetFilter = useStore((s) => s.toggleSetFilter);
  const setMinFrequency = useStore((s) => s.setMinFrequency);
  const resetFilters = useStore((s) => s.resetFilters);
  const setSearch = useStore((s) => s.setSearch);

  if (!data) return null;

  const einzelplanEntries = Object.entries(data.einzelplaene).sort((a, b) =>
    a[1].label.localeCompare(b[1].label, "de"),
  );

  return (
    <aside className="panel filter-panel">
      <div className="filter-panel-scroll">
        <h1>Digitalhaushalt</h1>
        <p className="subtitle">Semantischer Netzwerk-Explorer</p>

        <section>
          <h2>
            Ansicht
            <InfoTooltip text="Wechselt die Struktur des Netzwerks: Entweder nur thematische Keywords untereinander (Ko-Occurrence) oder die direkten Verknüpfungen zwischen Keywords und den verantwortlichen Ministerien." />
          </h2>
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
        </section>

        <section>
          <h2>
            Suche
            <InfoTooltip text="Hebt gesuchte Keywords oder Ministerien im Graphen farblich hervor." />
          </h2>
          <input
            type="search"
            placeholder="Keyword hervorheben…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </section>

        <section>
          <h2>
            Haushaltsjahr
            <InfoTooltip text="Schränkt die Datenbasis auf ein spezifisches Jahr ein. Es werden nur Haushaltstitel betrachtet, die in diesem Jahr ein Soll-Budget hatten." />
          </h2>
          <div className="chips">
            {data.jahre.map((j) => (
              <button
                key={j}
                className={`chip ${filters.jahr === j ? "active" : ""}`}
                onClick={() => setJahr(j)}>
                {j}
              </button>
            ))}
          </div>
        </section>

        <details className="advanced-filters">
          <summary>Erweiterte Filtermöglichkeiten</summary>

          <details className="filter-accordion">
            <summary>
              <h2>
                Einzelplan
                <InfoTooltip text="Filtert den Datensatz nach bestimmten Ressorts (Ministerien) und obersten Bundesbehörden." />
              </h2>
            </summary>
            <div className="filter-accordion-content checklist scroll">
              {einzelplanEntries.map(([id, info]) => (
                <label key={id} className="checkbox">
                  <input
                    type="checkbox"
                    checked={filters.einzelplaene.has(id)}
                    onChange={() => toggleSetFilter("einzelplaene", id)}
                  />
                  {info.label}
                </label>
              ))}
            </div>
          </details>

          <details className="filter-accordion">
            <summary>
              <h2>
                Digitalisierungsbereich
                <InfoTooltip text="Filtert die Titel nach den übergeordneten Themengebieten der Digitalisierung (z.B. Verwaltung, Wirtschaft, Gesundheit)." />
              </h2>
            </summary>
            <div className="filter-accordion-content checklist">
              {Object.entries(data.bereiche).map(([id, label]) => (
                <label key={id} className="checkbox">
                  <input
                    type="checkbox"
                    checked={filters.bereiche.has(id)}
                    onChange={() => toggleSetFilter("bereiche", id)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </details>

          <details className="filter-accordion">
            <summary>
              <h2>
                Digitalisierungsklasse
                <InfoTooltip text="Filtert nach der methodischen Einstufung, wie direkt der Digitalbezug des Haushaltstitels ist (von komplett digital bis zu manuellen Schätzwerten)." />
              </h2>
            </summary>
            <div className="filter-accordion-content checklist">
              {Object.entries(data.klassen)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([id, label]) => (
                  <label key={id} className="checkbox">
                    <input
                      type="checkbox"
                      checked={filters.klassen.has(id)}
                      onChange={() => toggleSetFilter("klassen", id)}
                    />
                    {label}
                  </label>
                ))}
            </div>
          </details>

          <details className="filter-accordion">
            <summary>
              <h2>
                Hauptgruppe
                <InfoTooltip text="Filtert nach der groben wirtschaftlichen Art der Ausgaben (z.B. Personalausgaben, Sächliche Verwaltungsausgaben, Zuweisungen)." />
              </h2>
            </summary>
            <div className="filter-accordion-content checklist">
              {Object.entries(data.hauptgruppen)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([id, label]) => (
                  <label key={id} className="checkbox">
                    <input
                      type="checkbox"
                      checked={filters.hauptgruppen.has(id)}
                      onChange={() => toggleSetFilter("hauptgruppen", id)}
                    />
                    {label}
                  </label>
                ))}
            </div>
          </details>

          <details className="filter-accordion">
            <summary>
              <h2>
                Hauptfunktion
                <InfoTooltip text="Filtert nach dem groben fachlichen Aufgabenbereich der Ausgaben im Bundeshaushalt (z.B. Bildung, Verkehr, Gesundheit)." />
              </h2>
            </summary>
            <div className="filter-accordion-content checklist">
              {Object.entries(data.hauptfunktionen)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([id, label]) => (
                  <label key={id} className="checkbox">
                    <input
                      type="checkbox"
                      checked={filters.hauptfunktionen.has(id)}
                      onChange={() => toggleSetFilter("hauptfunktionen", id)}
                    />
                    {label}
                  </label>
                ))}
            </div>
          </details>

          <div className="filter-accordion" style={{ paddingBottom: "12px" }}>
            <h2
              style={{
                marginTop: "12px",
                display: "flex",
                justifyContent: "space-between",
              }}>
              <span>
                Mindesthäufigkeit
                <InfoTooltip text="Blendet Knoten aus, die seltener als der gewählte Wert auftreten. Hilft, das Netzwerk übersichtlicher zu machen." />
              </span>
              <strong style={{ color: "var(--text)" }}>
                {filters.minFrequency}
              </strong>
            </h2>
            <div
              className="filter-accordion-content"
              style={{ paddingTop: "4px" }}>
              <input
                type="range"
                min={1}
                max={20}
                value={filters.minFrequency}
                onChange={(e) => setMinFrequency(Number(e.target.value))}
              />
            </div>
          </div>

          <div
            className="filter-accordion"
            style={{ paddingBottom: "12px", borderBottom: "none" }}>
            <h2 style={{ marginTop: 16 }}>
              Knotengröße nach
              <InfoTooltip text="Steuert, ob die Kreise im Graphen nach der absoluten Anzahl der beteiligten Haushaltstitel oder nach dem zugrundeliegenden digitalen Budget (in T€) skaliert werden." />
            </h2>
            <div className="mode-toggle">
              <button
                className={nodeSizeMetric === "count" ? "active" : ""}
                onClick={() => setNodeSizeMetric("count")}>
                Anzahl Titel
              </button>
              <button
                className={nodeSizeMetric === "budget" ? "active" : ""}
                onClick={() => setNodeSizeMetric("budget")}>
                Max. Budget (SOLL)
              </button>
            </div>
          </div>
        </details>
      </div>

      <div className="filter-panel-footer">
        <button className="reset" onClick={resetFilters}>
          Filter zurücksetzen
        </button>
      </div>
    </aside>
  );
}
