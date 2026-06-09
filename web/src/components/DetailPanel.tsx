import { useEffect, useMemo, useState } from "react";
import { useStore } from "../store";
import {
  einzelplanStats,
  keywordStats,
  type EinzelplanStats,
  type KeywordStats,
} from "../graph/buildGraph";
import { fetchWikidata, type WikidataInfo } from "../services/wikidata";
import InfoTooltip from "./InfoTooltip";

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
  const [distTab, setDistTab] = useState<"bereich" | "ressort">("bereich");
  const [semTab, setSemTab] = useState<"phrasen" | "kookkurrenz">("phrasen");

  useEffect(() => { setDistTab("bereich"); setSemTab("phrasen"); }, [selectedNodeId]);

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

          <section className="distribution-section">
            <h3>Verteilung</h3>
            <div className="detail-tabs">
              <button
                className={distTab === "bereich" ? "active" : ""}
                onClick={() => setDistTab("bereich")}>
                nach Digitalbereich
                <InfoTooltip text="Zeigt, in welchen thematischen Digitalisierungsbereichen (z.B. Verwaltung, Infrastruktur) dieses Keyword vorkommt." />
              </button>
              <button
                className={distTab === "ressort" ? "active" : ""}
                onClick={() => setDistTab("ressort")}>
                nach Einzelplan
                <InfoTooltip text="Listet die Ministerien und obersten Bundesbehörden auf, die dieses Keyword in ihren Titeln verwenden." />
              </button>
            </div>

            {distTab === "bereich" &&
              kwStats.bereichCounts &&
              kwStats.bereichCounts.length > 0 && (
                <div className="dist-list">
                  {kwStats.bereichCounts.map((b) => {
                    const total = kwStats.bereichCounts.reduce(
                      (sum, item) => sum + item.count,
                      0,
                    );
                    const pct = Math.round((b.count / total) * 100);
                    return (
                      <div key={b.id} className="dist-row">
                        <div className="dist-label">
                          <span className="dist-name">{b.label}</span>
                          <span className="dist-count">{b.count}</span>
                        </div>
                        <div className="dist-bar-bg">
                          <div
                            className="dist-bar-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            {distTab === "bereich" &&
              (!kwStats.bereichCounts ||
                kwStats.bereichCounts.length === 0) && (
                <p className="muted small" style={{ marginTop: 10 }}>
                  Keine Daten verfügbar.
                </p>
              )}

            {distTab === "ressort" && (
              <div className="dist-list">
                {kwStats.actors.slice(0, 10).map((a) => {
                  const total = kwStats.actors.reduce(
                    (sum, item) => sum + item.count,
                    0,
                  );
                  const pct = Math.round((a.count / total) * 100);
                  return (
                    <button
                      key={a.id}
                      className="dist-row clickable"
                      onClick={() => selectNode(`ep:${a.id}`)}>
                      <div className="dist-label">
                        <span className="dist-name">{a.label}</span>
                        <span className="dist-count">{a.count}</span>
                      </div>
                      <div className="dist-bar-bg">
                        <div
                          className="dist-bar-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="distribution-section">
            <h3>Semantik</h3>
            <div className="detail-tabs">
              <button
                className={semTab === "phrasen" ? "active" : ""}
                onClick={() => setSemTab("phrasen")}>
                Wortkontext
                <InfoTooltip text="Zeigt, wie dieses Keyword tatsächlich im Fließtext der Haushaltstitel vorkommt (z.B. als 'digitale Infrastruktur' statt nur 'Infrastruktur')." />
              </button>
              <button
                className={semTab === "kookkurrenz" ? "active" : ""}
                onClick={() => setSemTab("kookkurrenz")}>
                Themenverbünde
                <InfoTooltip text="Listet andere Keywords auf, die gemeinsam mit diesem in denselben Haushaltstiteln vorkommen – je häufiger, desto enger der thematische Zusammenhang." />
              </button>
            </div>

            {semTab === "phrasen" && kwStats.phrases && kwStats.phrases.length > 0 && (
              <div className="dist-list">
                {kwStats.phrases.map((p) => (
                  <div key={p.label} className="dist-row">
                    <div className="dist-label">
                      <span className="dist-name">{p.label}</span>
                      <span className="dist-count">{p.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {semTab === "phrasen" && (!kwStats.phrases || kwStats.phrases.length === 0) && (
              <p className="muted small" style={{ marginTop: 10 }}>Keine Wortkontexte gefunden.</p>
            )}

            {semTab === "kookkurrenz" && kwStats.cooccurrences.length > 0 && (
              <div className="dist-list">
                {kwStats.cooccurrences.map((c) => {
                  const total = kwStats.cooccurrences.reduce((sum, item) => sum + item.count, 0);
                  const pct = Math.round((c.count / total) * 100);
                  return (
                    <button
                      key={c.id}
                      className="dist-row clickable"
                      onClick={() => selectNode(`kw:${c.id}`)}>
                      <div className="dist-label">
                        <span className="dist-name">{c.label}</span>
                        <span className="dist-count">{c.count}</span>
                      </div>
                      <div className="dist-bar-bg">
                        <div className="dist-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {semTab === "kookkurrenz" && kwStats.cooccurrences.length === 0 && (
              <p className="muted small" style={{ marginTop: 10 }}>Keine Themenverbünde im aktuellen Filter.</p>
            )}
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
