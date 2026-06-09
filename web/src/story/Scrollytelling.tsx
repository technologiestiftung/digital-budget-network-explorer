import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { einzelplanStats } from "../graph/buildGraph";
import type { Filters, GraphData } from "../types";
import StoryBackground, { type StoryFocus } from "./StoryBackground";
import { STORY_CHAIN, STORY_MINISTRIES } from "./storyConfig";
import CountUp from "./CountUp";

const EMPTY_FILTERS: Filters = {
  jahre: new Set(),
  bereiche: new Set(),
  klassen: new Set(),
  einzelplaene: new Set(),
  minFrequency: 1,
  nurDigital: false,
};

interface Panel {
  key: string;
  focus: StoryFocus;
}

function useMinistries(data: GraphData) {
  return useMemo(
    () =>
      STORY_MINISTRIES.map((m) => {
        const stats = einzelplanStats(data, EMPTY_FILTERS, m.epId);
        const top = stats.topKeywords.slice(0, 6);
        return {
          ...m,
          label: data.einzelplaene[m.epId]?.label ?? `Einzelplan ${m.epId}`,
          kwIds: top.map((k) => k.id),
          kwLabels: top.map((k) => k.label),
        };
      }),
    [data],
  );
}

export default function Scrollytelling() {
  const data = useStore((s) => s.data)!;
  const setView = useStore((s) => s.setView);
  const chain = useMemo(() => STORY_CHAIN.map((c) => c.id), []);
  const ministries = useMinistries(data);

  // Reihenfolge der Panels + zugehoeriger Fokus
  const panels = useMemo<Panel[]>(() => {
    const list: Panel[] = [
      { key: "hero", focus: { type: "all" } },
      { key: "stats", focus: { type: "all" } },
    ];
    STORY_CHAIN.forEach((_, i) =>
      list.push({ key: `chain-${i}`, focus: { type: "chain", upto: i } }),
    );
    ministries.forEach((m) =>
      list.push({
        key: `min-${m.epId}`,
        focus: { type: "set", ids: m.kwIds, primary: m.epId },
      }),
    );
    list.push({ key: "cta", focus: { type: "all" } });
    return list;
  }, [ministries]);

  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const ratios = new Map<number, number>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const idx = Number((e.target as HTMLElement).dataset.idx);
          ratios.set(idx, e.isIntersecting ? e.intersectionRatio : 0);
        }
        let best = 0;
        let bestRatio = -1;
        for (const [idx, r] of ratios) {
          if (r > bestRatio) {
            bestRatio = r;
            best = idx;
          }
        }
        if (bestRatio > 0.4) setActive(best);
      },
      { threshold: [0.4, 0.6, 0.8] },
    );
    refs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [panels.length]);

  const focus = panels[active]?.focus ?? { type: "all" };

  const budgetMrd = useMemo(() => {
    const latest = Math.max(...data.jahre);
    let sumT = 0;
    for (const p of data.posten)
      if (p.jahr === latest && p.soll) sumT += p.soll;
    return { value: sumT / 1e6, jahr: latest }; // T€ -> Mrd €
  }, [data]);

  const setRef = (i: number) => (el: HTMLElement | null) => {
    refs.current[i] = el;
  };

  // Hilfsindex je Panel-Key
  const idxOf = (key: string) => panels.findIndex((p) => p.key === key);

  return (
    <div className="story">
      <div className="story-bg-wrap">
        <StoryBackground data={data} chain={chain} focus={focus} />
        <div className="story-bg-fade" />
      </div>

      <div className="story-content">
        {/* Screen 1 – Hero */}
        <section
          ref={setRef(idxOf("hero"))}
          data-idx={idxOf("hero")}
          className={`story-panel hero ${active === idxOf("hero") ? "is-active" : ""}`}>
          <div className="panel-inner center">
            <p className="eyebrow">
              Wofür zahlen wir, wenn wir von Digitalisierung im Bundeshalt
              sprechen?
            </p>
            <h1 className="hero-title">
              Die Macht der <em>Worte</em>
            </h1>
            <ul className="hero-questions">
              <li>Welche Begriffe prägen die Digitalisierungsausgaben?</li>
              <li>Welche Themen verbinden Ministerien?</li>
              <li>Welche Technologien werden gemeinsam gefördert?</li>
            </ul>
            <div className="scroll-hint">Scrollen zum Erkunden ↓</div>
          </div>
        </section>

        {/* Screen 2 – Erklärung / Zahlen */}
        <section
          ref={setRef(idxOf("stats"))}
          data-idx={idxOf("stats")}
          className={`story-panel ${active === idxOf("stats") ? "is-active" : ""}`}>
          <div className="panel-inner">
            <h2 className="screen-title">Der Datensatz enthält</h2>
            <div className="stat-cards">
              <div className="stat-card">
                <span className="stat-num">
                  <CountUp
                    value={data.meta.counts.titel ?? 0}
                    active={active === idxOf("stats")}
                  />
                </span>
                <span className="stat-label">Haushaltstitel</span>
              </div>
              <div className="stat-card">
                <span className="stat-num">
                  <CountUp
                    value={data.meta.counts.keywords}
                    active={active === idxOf("stats")}
                  />
                </span>
                <span className="stat-label">Keywords</span>
              </div>
              <div className="stat-card">
                <span className="stat-num">
                  <CountUp
                    value={data.meta.counts.einzelplaene}
                    active={active === idxOf("stats")}
                  />
                </span>
                <span className="stat-label">Ministerien & Organe</span>
              </div>
              <div className="stat-card">
                <span className="stat-num">
                  ≈{" "}
                  <CountUp
                    value={budgetMrd.value}
                    decimals={1}
                    active={active === idxOf("stats")}
                  />{" "}
                  Mrd €
                </span>
                <span className="stat-label">
                  Soll-Volumen {budgetMrd.jahr}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Screen 3 – Storytelling-Kette */}
        {STORY_CHAIN.map((c, i) => {
          const idx = idxOf(`chain-${i}`);
          return (
            <section
              key={c.id}
              ref={setRef(idx)}
              data-idx={idx}
              className={`story-panel chain ${active === idx ? "is-active" : ""}`}>
              <div className="panel-inner">
                <span className="chain-step">
                  {i + 1} / {STORY_CHAIN.length}
                </span>
                <h2 className="chain-word">{c.label}</h2>
                <p className="chain-note">{c.note}</p>
                {i < STORY_CHAIN.length - 1 && (
                  <div className="chain-arrow">↓</div>
                )}
              </div>
            </section>
          );
        })}

        {/* Screen 4 – Ministerien */}
        {ministries.map((m) => {
          const idx = idxOf(`min-${m.epId}`);
          return (
            <section
              key={m.epId}
              ref={setRef(idx)}
              data-idx={idx}
              className={`story-panel ministry ${active === idx ? "is-active" : ""}`}>
              <div className="panel-inner">
                <h2 className="screen-title">
                  Welche Ressorts beschäftigen sich mit ähnlichen Themen?
                </h2>
                <div className="ministry-card">
                  <span className="ministry-short">{m.short}</span>
                  <span className="ministry-name">{m.label}</span>
                  <div className="ministry-keywords">
                    {m.kwLabels.map((l) => (
                      <span className="mini-tag" key={l}>
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          );
        })}

        {/* Screen 5 – Call to Action */}
        <section
          ref={setRef(idxOf("cta"))}
          data-idx={idxOf("cta")}
          className={`story-panel cta ${active === idxOf("cta") ? "is-active" : ""}`}>
          <div className="panel-inner center">
            <h2 className="cta-title">Jetzt selbst erkunden</h2>
            <p className="cta-sub">
              Filtere nach Jahr, Ressort und Thema – und entdecke, welche
              Begriffe den Digitalhaushalt verbinden.
            </p>
            <button className="cta-button" onClick={() => setView("explore")}>
              Netzwerk-Explorer öffnen →
            </button>
          </div>
        </section>
      </div>

      <button className="story-skip" onClick={() => setView("explore")}>
        Intro überspringen
      </button>
    </div>
  );
}
