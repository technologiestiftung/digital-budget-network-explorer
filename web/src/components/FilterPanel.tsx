import { useStore } from "../store";
import InfoTooltip from "./InfoTooltip";

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
  const mobileFilterOpen = useStore((s) => s.mobileFilterOpen);
  const setMobileFilterOpen = useStore((s) => s.setMobileFilterOpen);

  if (!data) return null;

  const einzelplanEntries = Object.entries(data.einzelplaene).sort((a, b) =>
    a[1].label.localeCompare(b[1].label, "de"),
  );

  return (
    <aside className={`panel filter-panel ${mobileFilterOpen ? "is-open" : ""}`}>
      <button className="mobile-close-btn" onClick={() => setMobileFilterOpen(false)}>×</button>
      <div className="filter-panel-scroll">
        <h1>Die Vielfalt der Worte</h1>
        <p className="subtitle">
          Entdecke das Sprachnetzwerk zum Digitalhaushalts des Bundes
        </p>

        <section>
          <h2>
            Ansicht
            <InfoTooltip text="Verändert die Netzwerkstruktur: ‘Schlagwort’ zeigt nur die Verknüpfungen der thematischen Schlagworte untereinander (co-occurance). ‘Einzelplan’ zeigt die direkten Verknüpfungen zwischen Schlagworten und den zuständigen Bundesinstitutionen." />
          </h2>
          <div className="mode-toggle">
            <button
              className={mode === "keyword" ? "active" : ""}
              onClick={() => setMode("keyword")}>
              Schlagwort
            </button>
            <button
              className={mode === "bipartite" ? "active" : ""}
              onClick={() => setMode("bipartite")}>
              Einzelplan
            </button>
          </div>
        </section>

        <section>
          <h2>
            Suche
            <InfoTooltip text="Hebt gefundene Schlagworte oder Bundesinstitutionen im Netzwerk hervor." />
          </h2>
          <input
            type="search"
            placeholder="Keyword suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </section>

        <section>
          <h2>
            Haushaltsjahr
            <InfoTooltip text="Schränkt die Datenbasis auf ein spezifisches Jahr ein. Es werden nur Haushaltstitel angezeigt, die im ausgewählten Jahr ein Digital-Soll-Budget hatten." />
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
                <InfoTooltip text="Filtert den Datensatz nach ausgewählten Bundesinstitutionen (= Einzelplänen). Eine Mehrfachauswahl ist möglich." />
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
                <InfoTooltip text="Filtert die Haushaltstitel nach übergeordneten Themengebieten der Digitalisierung. Die Kategorisierung beruht auf der Einschätzung der Agora bei der Berechnung des Haushalts." />
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
                <InfoTooltip text="Filtert nach methodischer Einstufung, wie direkt der Digitalbezug des Haushaltstitels ist. Die Einstufung beruht auf der Einschätzung der Agora bei der Berechnung des Haushalts." />
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
                <InfoTooltip text="Filtert nach der im Bundeshaushalt zugeordneten Hauptgruppe. Diese gibt Aufschlüsse über die groben wirtschaftlichen Art der Ausgaben." />
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
                <InfoTooltip text="Filtert nach der im Bundeshaushalt zugeordneten Hauptfunktion. Diese gibt Aufschlüsse über den groben fachlichen Aufgabenbereich der Ausgaben." />
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
                <InfoTooltip text="Blendet Knoten aus, die seltener als der gewählte Wert in Titeln auftreten. Unterstützt dabei, die Netzwerk-Visualisierung übersichtlich zu halten." />
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
              <InfoTooltip text="Bestimmt ob die Kreisgröße entweder nach der absoluten Anzahl der beteiligten Haushaltstitel oder nach dem zugrundeliegenden digitalen Budget (SOLL, enge Variante) skaliert werden. Der Budget-Vergleich ist mit vorsicht zu genießen, da ein Haushaltstitel viele verschiedene Themen abdecken kann." />
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
                Maximales Budget
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
