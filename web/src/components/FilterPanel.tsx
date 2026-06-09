import { useStore } from "../store";
import { BEREICH_COLORS } from "../colors";

export default function FilterPanel() {
  const data = useStore((s) => s.data);
  const filters = useStore((s) => s.filters);
  const mode = useStore((s) => s.mode);
  const search = useStore((s) => s.search);
  const setMode = useStore((s) => s.setMode);
  const toggleJahr = useStore((s) => s.toggleJahr);
  const toggleSetFilter = useStore((s) => s.toggleSetFilter);
  const setMinFrequency = useStore((s) => s.setMinFrequency);
  const setNurDigital = useStore((s) => s.setNurDigital);
  const resetFilters = useStore((s) => s.resetFilters);
  const setSearch = useStore((s) => s.setSearch);

  if (!data) return null;

  const einzelplanEntries = Object.entries(data.einzelplaene).sort((a, b) =>
    a[1].label.localeCompare(b[1].label, "de"),
  );

  return (
    <aside className="panel filter-panel">
      <h1>Digitalhaushalt</h1>
      <p className="subtitle">Semantischer Netzwerk-Explorer</p>

      <section>
        <h2>Ansicht</h2>
        <div className="mode-toggle">
          <button
            className={mode === "keyword" ? "active" : ""}
            onClick={() => setMode("keyword")}
          >
            Keyword-Netzwerk
          </button>
          <button
            className={mode === "bipartite" ? "active" : ""}
            onClick={() => setMode("bipartite")}
          >
            Keyword ↔ Einzelplan
          </button>
        </div>
      </section>

      <section>
        <h2>Suche</h2>
        <input
          type="search"
          placeholder="Keyword hervorheben…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      <section>
        <h2>
          Mindesthäufigkeit: <strong>{filters.minFrequency}</strong>
        </h2>
        <input
          type="range"
          min={1}
          max={20}
          value={filters.minFrequency}
          onChange={(e) => setMinFrequency(Number(e.target.value))}
        />
        <label className="checkbox">
          <input
            type="checkbox"
            checked={filters.nurDigital}
            onChange={(e) => setNurDigital(e.target.checked)}
          />
          Nur Posten mit digitalem Anteil
        </label>
      </section>

      <section>
        <h2>Haushaltsjahr</h2>
        <div className="chips">
          {data.jahre.map((j) => (
            <button
              key={j}
              className={`chip ${filters.jahre.has(j) ? "active" : ""}`}
              onClick={() => toggleJahr(j)}
            >
              {j}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Digitalisierungsbereich</h2>
        <div className="checklist">
          {Object.entries(data.bereiche).map(([id, label]) => (
            <label key={id} className="checkbox">
              <input
                type="checkbox"
                checked={filters.bereiche.has(id)}
                onChange={() => toggleSetFilter("bereiche", id)}
              />
              <span
                className="swatch"
                style={{ background: BEREICH_COLORS[id] ?? "#9aa7b5" }}
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2>Digitalisierungsklasse</h2>
        <div className="checklist">
          {Object.entries(data.klassen)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([id, label]) => (
              <label key={id} className="checkbox">
                <input
                  type="checkbox"
                  checked={filters.klassen.has(id)}
                  onChange={() => toggleSetFilter("klassen", id)}
                />
                <span className="muted">{id}</span> {label}
              </label>
            ))}
        </div>
      </section>

      <section>
        <h2>Einzelplan (Ressort)</h2>
        <div className="checklist scroll">
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
      </section>

      <button className="reset" onClick={resetFilters}>
        Filter zurücksetzen
      </button>
    </aside>
  );
}
