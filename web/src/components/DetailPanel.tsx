import { useEffect, useMemo, useState } from "react";
import { useStore } from "../store";
import {
  einzelplanStats,
  keywordStats,
  type EinzelplanStats,
  type KeywordStats,
} from "../graph/buildGraph";
import { fetchWikidata, type WikidataInfo } from "../services/wikidata";

function formatTEur(value: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(
    Math.round(value),
  );
}

export default function DetailPanel() {
  const data = useStore((s) => s.data);
  const filters = useStore((s) => s.filters);
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const selectNode = useStore((s) => s.selectNode);

  const parsed = useMemo(() => {
    if (!selectedNodeId) return null;
    const [kind, ...rest] = selectedNodeId.split(":");
    return { kind, localId: rest.join(":") };
  }, [selectedNodeId]);

  const meta = useMemo(() => {
    if (!data || !parsed) return null;
    if (parsed.kind === "kw") {
      const info = data.keywords[parsed.localId];
      return {
        kind: "keyword" as const,
        label: info?.label ?? parsed.localId,
        qid: info?.qid ?? null,
      };
    }
    const info = data.einzelplaene[parsed.localId];
    return {
      kind: "einzelplan" as const,
      label: info?.label ?? `Einzelplan ${parsed.localId}`,
      qid: info?.qid ?? null,
    };
  }, [data, parsed]);

  const kwStats: KeywordStats | null = useMemo(() => {
    if (!data || !parsed || parsed.kind !== "kw") return null;
    return keywordStats(data, filters, parsed.localId);
  }, [data, filters, parsed]);

  const epStats: EinzelplanStats | null = useMemo(() => {
    if (!data || !parsed || parsed.kind !== "ep") return null;
    return einzelplanStats(data, filters, parsed.localId);
  }, [data, filters, parsed]);

  const [wd, setWd] = useState<WikidataInfo | null>(null);
  const [wdLoading, setWdLoading] = useState(false);
  const [wdError, setWdError] = useState<string | null>(null);

  useEffect(() => {
    setWd(null);
    setWdError(null);
    const qid = meta?.qid;
    if (!qid) return;
    let cancelled = false;
    setWdLoading(true);
    fetchWikidata(qid)
      .then((info) => {
        if (!cancelled) setWd(info);
      })
      .catch((err) => {
        if (!cancelled) setWdError(String(err.message ?? err));
      })
      .finally(() => {
        if (!cancelled) setWdLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [meta?.qid]);

  if (!selectedNodeId || !meta) {
    return (
      <aside className="panel detail-panel empty">
        <p className="hint">
          Knoten anklicken, um Details, Akteure und Kontext aus Wikidata zu
          sehen.
        </p>
      </aside>
    );
  }

  return (
    <aside className="panel detail-panel">
      <button className="close" onClick={() => selectNode(null)}>
        ×
      </button>
      <span className={`badge ${meta.kind}`}>
        {meta.kind === "keyword" ? "Keyword" : "Einzelplan"}
      </span>
      <h2 className="detail-title">{meta.label}</h2>

      <section className="wikidata">
        {!meta.qid && (
          <p className="muted small">
            Keine Wikidata-Verknüpfung im Datensatz.
          </p>
        )}
        {meta.qid && wdLoading && <p className="muted small">Lade Wikidata…</p>}
        {wdError && <p className="error small">Wikidata: {wdError}</p>}
        {wd && (
          <div className="wd-card">
            {wd.imageUrl && (
              <img className="wd-image" src={wd.imageUrl} alt={meta.label} />
            )}
            {wd.description && <p className="wd-desc">{wd.description}</p>}
            <div className="wd-links">
              <a href={wd.url} target="_blank" rel="noreferrer">
                Wikidata ({wd.qid})
              </a>
              {wd.wikipediaUrl && (
                <a href={wd.wikipediaUrl} target="_blank" rel="noreferrer">
                  Wikipedia
                </a>
              )}
            </div>
          </div>
        )}
      </section>

      {kwStats && (
        <>
          <div className="stats-grid">
            <div className="stat">
              <span className="num">{kwStats.frequency}</span>
              <span className="lbl">Titel</span>
            </div>
            <div className="stat">
              <span className="num">{kwStats.actors.length}</span>
              <span className="lbl">Einzelpläne</span>
            </div>
            <div className="stat">
              <span className="num">{formatTEur(kwStats.digSum)}</span>
              <span className="lbl">T€ IST digital (weit)</span>
            </div>
          </div>

          {kwStats.bereichCounts && kwStats.bereichCounts.length > 0 && (
            <section>
              <h3>Verteilung nach Digitalisierungsbereich</h3>
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
            </section>
          )}

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
          )}

          <section>
            <h3>Akteure (Einzelpläne)</h3>
            <ul className="bars">
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
          </section>

          <section>
            <h3>Tritt gemeinsam auf mit</h3>
            <div className="tags">
              {kwStats.cooccurrences.map((c) => (
                <button
                  key={c.id}
                  className="tag"
                  onClick={() => selectNode(`kw:${c.id}`)}>
                  {c.label} <span className="muted">×{c.count}</span>
                </button>
              ))}
              {kwStats.cooccurrences.length === 0 && (
                <span className="muted small">
                  Keine Ko-Occurrence im Filter.
                </span>
              )}
            </div>
          </section>

          <section>
            <h3>Haushaltstitel ({kwStats.titles.length})</h3>
            <details className="title-details">
              <summary>Titel anzeigen</summary>
              <ul className="title-list">
                {kwStats.titles.map((t) => (
                  <li key={t.id} title={t.id}>
                    {t.label}
                  </li>
                ))}
              </ul>
            </details>
          </section>
        </>
      )}

      {epStats && (
        <>
          <div className="stats-grid">
            <div className="stat">
              <span className="num">{epStats.frequency}</span>
              <span className="lbl">Titel</span>
            </div>
            <div className="stat">
              <span className="num">{epStats.topKeywords.length}</span>
              <span className="lbl">Keywords</span>
            </div>
            <div className="stat">
              <span className="num">{formatTEur(epStats.digSum)}</span>
              <span className="lbl">T€ IST digital (weit)</span>
            </div>
          </div>

          <section>
            <h3>Häufigste Keywords</h3>
            <div className="tags">
              {epStats.topKeywords.map((k) => (
                <button
                  key={k.id}
                  className="tag"
                  onClick={() => selectNode(`kw:${k.id}`)}>
                  {k.label} <span className="muted">×{k.count}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3>Haushaltstitel ({epStats.titles.length})</h3>
            <details className="title-details">
              <summary>Titel anzeigen</summary>
              <ul className="title-list">
                {epStats.titles.map((t) => (
                  <li key={t.id} title={t.id}>
                    {t.label}
                  </li>
                ))}
              </ul>
            </details>
          </section>
        </>
      )}
    </aside>
  );
}
