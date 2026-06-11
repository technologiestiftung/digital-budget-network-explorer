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

  useEffect(() => {
    setDistTab("bereich");
    setSemTab("phrasen");
  }, [selectedNodeId]);

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
            <h3>Verlinkung zum Wissensgraph</h3>
            {wd.imageUrl && (
              <img className="wd-image" src={wd.imageUrl} alt={meta.label} />
            )}
            {wd.description && <p className="wd-desc">{wd.description}</p>}

            {((wd.instanceOf?.length ?? 0) > 0 ||
              (wd.subclassOf?.length ?? 0) > 0) && (
              <div className="wd-classes">
                {(wd.instanceOf?.length ?? 0) > 0 && (
                  <div className="wd-class-group">
                    <span className="wd-class-label">Instanz von</span>
                    <div className="wd-class-tags">
                      {(wd.instanceOf ?? []).map((c) => (
                        <a
                          key={c.id}
                          className="wd-class-tag"
                          href={"https://www.wikidata.org/wiki/" + c.id}
                          target="_blank"
                          rel="noreferrer">
                          {c.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {(wd.subclassOf?.length ?? 0) > 0 && (
                  <div className="wd-class-group">
                    <span className="wd-class-label">Unterklasse von</span>
                    <div className="wd-class-tags">
                      {(wd.subclassOf ?? []).map((c) => (
                        <a
                          key={c.id}
                          className="wd-class-tag"
                          href={"https://www.wikidata.org/wiki/" + c.id}
                          target="_blank"
                          rel="noreferrer">
                          {c.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {meta.kind === "keyword" && meta.qid && (
              <div className="wd-category">
                <span
                  className="wd-category-dot"
                  style={{
                    background: (() => {
                      const t =
                        (data!.keywords as any)[parsed!.localId]?.type ??
                        "other";
                      const colors: Record<string, string> = {
                        tech: "#DCE14B",
                        org: "#41B496",
                        law: "#7F7BED",
                        infra: "#41B496",
                        science: "#FBD8F2",
                        other: "#FB7A68",
                      };
                      return colors[t] ?? "#FB7A68";
                    })(),
                  }}
                />
                <span className="wd-category-text">
                  Kategorie:{" "}
                  <strong>
                    {(() => {
                      const type =
                        (data!.keywords as any)[parsed!.localId]?.type ??
                        "other";
                      const labels: Record<string, string> = {
                        tech: "Technologie / Software",
                        org: "Organisation / Akteur",
                        law: "Recht / Strategie",
                        infra: "Infrastruktur / Hardware",
                        science: "Forschung / Methode",
                        other: "Sonstiges",
                      };
                      return labels[type] ?? "Sonstiges";
                    })()}
                  </strong>
                  <InfoTooltip text="Die Kategorie wird automatisch aus den Wikidata-Instanz- und Unterklassen-Beziehungen (P31/P279) abgeleitet: Ein Begriff wird z. B. der Kategorie 'Technologie / Software' zugeordnet, wenn er in der Wikidata-Hierarchie direkt oder indirekt mit 'Software', 'Computerprogramm', 'Künstliche Intelligenz' o. Ä. verwandt ist." />
                </span>
              </div>
            )}

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
              <span className="lbl">Das Keyword taucht in</span>
              <span className="num">{kwStats.frequency}</span>
              <span className="lbl">Titeln auf</span>
            </div>
            <div className="stat">
              <span className="lbl">Das Keyword wird von</span>
              <span className="num">{kwStats.actors.length}</span>
              <span className="lbl">Einzelplänen verwendet</span>
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

            {semTab === "phrasen" &&
              kwStats.phrases &&
              kwStats.phrases.length > 0 && (
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
            {semTab === "phrasen" &&
              (!kwStats.phrases || kwStats.phrases.length === 0) && (
                <p className="muted small" style={{ marginTop: 10 }}>
                  Keine Wortkontexte gefunden.
                </p>
              )}

            {semTab === "kookkurrenz" && kwStats.cooccurrences.length > 0 && (
              <div className="dist-list">
                {kwStats.cooccurrences.map((c) => {
                  const total = kwStats.cooccurrences.reduce(
                    (sum, item) => sum + item.count,
                    0,
                  );
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
            {semTab === "kookkurrenz" && kwStats.cooccurrences.length === 0 && (
              <p className="muted small" style={{ marginTop: 10 }}>
                Keine Themenverbünde im aktuellen Filter.
              </p>
            )}
          </section>

          <details className="title-section-accordion">
            <summary>
              <h3 className="title-section-heading">
                Haushaltstitel ({kwStats.titles.length})
              </h3>
            </summary>
            <div className="title-summary-text">
              <span className="title-summary-soil">
                SOLL-eng gesamt:{" "}
                <strong>{formatTEur(kwStats.titlesSollEngSum)} T€</strong>
              </span>
              <InfoTooltip text="Summe der engen digitalen SOLL-Budgets aller aufgelisteten Haushaltstitel in Tausend Euro." />
            </div>
            <div className="title-card-list">
              {kwStats.titles.map((t) => (
                <details key={t.id} className="title-card">
                  <summary className="title-card-summary">
                    <span className="title-card-id">
                      {t.beschreibung ?? t.label}
                    </span>
                    <div className="title-card-meta-row">
                      <span className="title-card-ep">
                        {t.ep
                          ? data!.einzelplaene[t.ep]?.label || "EP " + t.ep
                          : "—"}
                      </span>
                      <span className="title-card-budget">
                        {formatTEur(t.sollEng ?? 0)} /{" "}
                        {formatTEur(t.istEng ?? 0)} T€
                      </span>
                    </div>
                  </summary>
                </details>
              ))}
            </div>
          </details>
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

          <details className="title-section-accordion">
            <summary>
              <h3 className="title-section-heading">Haushaltstitel</h3>
            </summary>
            <div className="title-summary-text">
              <span className="title-summary-soil">
                SOLL-eng gesamt:{" "}
                <strong>{formatTEur(epStats.titlesSollEngSum)} T€</strong>
              </span>
              <InfoTooltip text="Summe der engen digitalen SOLL-Budgets aller aufgelisteten Haushaltstitel in Tausend Euro." />
            </div>
            <div className="title-card-list">
              {epStats.titles.map((t) => (
                <details key={t.id} className="title-card">
                  <summary className="title-card-summary">
                    <span className="title-card-id">
                      {t.beschreibung ?? t.label}
                    </span>
                    <div className="title-card-meta-row">
                      <span className="title-card-ep">
                        {t.ep
                          ? data!.einzelplaene[t.ep]?.label || "EP " + t.ep
                          : "—"}
                      </span>
                      <span className="title-card-budget">
                        {formatTEur(t.sollEng ?? 0)} /{" "}
                        {formatTEur(t.istEng ?? 0)} T€
                      </span>
                    </div>
                  </summary>
                </details>
              ))}
            </div>
          </details>
        </>
      )}
    </aside>
  );
}
