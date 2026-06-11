import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { einzelplanStats } from "../graph/buildGraph";
import type { Filters, GraphData } from "../types";
import StoryBackground, { type StoryFocus } from "./StoryBackground";
import { STORY_CHAIN, STORY_MINISTRIES } from "./storyConfig";
import CountUp from "./CountUp";

const EMPTY_FILTERS: Filters = {
  jahr: null,
  bereiche: new Set(),
  klassen: new Set(),
  einzelplaene: new Set(),
  hauptgruppen: new Set(),
  hauptfunktionen: new Set(),
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
  const chain = useMemo(
    () => STORY_CHAIN.map((c) => ({ id: c.id, type: c.type, ids: c.ids })),
    [],
  );
  const ministries = useMinistries(data);

  // Reihenfolge der Panels + zugehoeriger Fokus
  const panels = useMemo<Panel[]>(() => {
    const list: Panel[] = [
      { key: "hero", focus: { type: "all", recenter: true } },
      { key: "quote", focus: { type: "all" } },
      { key: "explanation-title", focus: { type: "all" } },
      {
        key: "explanation-text",
        focus: {
          type: "all",
        },
      },
      { key: "stats", focus: { type: "all" } },
    ];
    STORY_CHAIN.forEach((c, i) => {
      if (c.title) {
        list.push({
          key: `chain-${i}-q`,
          focus: { type: "all", recenter: true },
        });
      }
      list.push({ key: `chain-${i}-a`, focus: { type: "chain", upto: i } });
    });
    ministries.forEach((m) =>
      list.push({
        key: `min-${m.epId}`,
        focus: { type: "set", ids: m.kwIds, primary: m.epId },
      }),
    );
    list.push({ key: "cta", focus: { type: "all", recenter: true } });
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
            <p className="eyebrow">Sprachnetzwerk Digitalhaushalt</p>
            <h1 className="hero-title">
              Die Vielfalt der <em>Worte</em>
            </h1>
            <ul className="hero-questions">
              <li>
                Wovon sprechen Bundesinstitutionen, wenn sie Digitalisierung
                meinen, fördern und vorantreiben?
              </li>
            </ul>
            <div className="scroll-hint">Scrollen zum Erkunden ↓</div>
          </div>
        </section>

        {/* Screen 2 – Zitat */}
        <section
          ref={setRef(idxOf("quote"))}
          data-idx={idxOf("quote")}
          className={`story-panel quote ${active === idxOf("quote") ? "is-active" : ""}`}>
          <div className="panel-inner center">
            <blockquote className="hero-quote">
              <div className="quote-mark">“</div>
              <p>
                Um die Magie eines Dinges zu verstehen, muss man seinen wahren
                Namen kennen […] womit ein Zauberer sein Leben verbringt, ist
                das Herausfinden der Namen der Dinge und wie man die Namen der
                Dinge herausfindet.
              </p>
              <div className="quote-separator"></div>
              <footer>
                — frei nach Ursula K. Le Guin, <cite>A Wizard of Earthsea</cite>
              </footer>
            </blockquote>
          </div>
        </section>

        {/* Screen 3 – Erklärung Titel */}
        <section
          ref={setRef(idxOf("explanation-title"))}
          data-idx={idxOf("explanation-title")}
          className={`story-panel ${active === idxOf("explanation-title") ? "is-active" : ""}`}>
          <div className="panel-inner center">
            <h2
              className="screen-title"
              style={{ fontSize: "clamp(30px, 4vw, 48px)" }}>
              Der Digitalhaushalt des Bundes
            </h2>
            <div className="explanation-text-block">
              <p>
                Mit "Digitalhaushalt" ist der{" "}
                <strong>Teil des Bundeshaushalts</strong> gemeint, der von
                Bundesinstitutionen für Aufgaben rund um die Digitalisierung
                verwendet wird.{" "}
              </p>
              <p>
                Es handelt sich dabei allerdings nicht um eine eindeutig
                festgelegte Kategorie. Um die{" "}
                <strong>Digitalausgaben des Bundes</strong> abzuschätzen, wurde
                der Haushalt deshalb durch die{" "}
                <a
                  href="https://agoradigital.de/projekte/digitalhaushalt/"
                  target="_blank"
                  rel="noreferrer">
                  Agora Digitale Transformation
                </a>{" "}
                analysiert.
              </p>
            </div>
            <div className="scroll-hint subtle">weiter scrollen ↓</div>
          </div>
        </section>

        {/* Screen 4 – Erklärung Text */}
        <section
          ref={setRef(idxOf("explanation-text"))}
          data-idx={idxOf("explanation-text")}
          className={`story-panel ${active === idxOf("explanation-text") ? "is-active" : ""}`}>
          <div className="panel-inner">
            <h2
              className="screen-title"
              style={{ fontSize: "clamp(30px, 4vw, 48px)" }}>
              Wie aus Worten Zahlen wurden
            </h2>
            <div className="stats-intro">
              <p>
                Dafür wurden die Haushaltstitel unter anderem auf{" "}
                <strong>vorher festgelegte Schlagworte</strong> hin analysiert,
                die als Kennzeichen für Ausgaben im Kontext von Digitalisierung
                festgelegt wurden.
              </p>
            </div>

            <div className="explanation-equation">
              <div className="eq-box">
                <span className="eq-text">
                  Haushaltstitel-Beschreibung enthält mindestens ein{" "}
                  <strong>"digitales" Schlagwort</strong>
                </span>
              </div>
              <div className="eq-arrow">➔</div>
              <div className="eq-box highlight">
                <span className="eq-text">
                  Titel ist Teil des <strong>Digitalhaushalts</strong>
                </span>
              </div>
            </div>
            <div className="stats-intro">
              <p>
                Die identifizierten Haushaltstitel und die damit verbundenen
                Schlagworte nehmen wir in der vorliegenden{" "}
                <strong>Netzwerk-Visualisierung</strong> unter die Lupe.
              </p>
            </div>
          </div>
        </section>

        {/* Screen 6 – Storytelling-Kette */}
        {STORY_CHAIN.flatMap((c, i) => {
          const res = [];
          if (c.title) {
            const idxQ = idxOf(`chain-${i}-q`);
            res.push(
              <section
                key={`chain-${i}-q`}
                ref={setRef(idxQ)}
                data-idx={idxQ}
                className={`story-panel chain question ${active === idxQ ? "is-active" : ""}`}>
                <div className="panel-inner center">
                  <span className="question-eyebrow">
                    Frage{" "}
                    {STORY_CHAIN.slice(0, i + 1).filter((x) => x.title).length}
                  </span>
                  <h2 className="question-title">{c.title}</h2>
                  <div className="scroll-hint subtle">weiter scrollen ↓</div>
                </div>
              </section>,
            );
          }

          const idxA = idxOf(`chain-${i}-a`);
          res.push(
            <section
              key={`chain-${i}-a`}
              ref={setRef(idxA)}
              data-idx={idxA}
              className={`story-panel chain answer ${active === idxA ? "is-active" : ""}`}>
              <div className="panel-inner">
                <span className="chain-step">
                  Beispiel {i + 1} / {STORY_CHAIN.length}
                </span>
                <h2 className="chain-word">{c.label}</h2>
                <p className="chain-note">{c.note}</p>
                {i < STORY_CHAIN.length - 1 && (
                  <div className="chain-arrow">↓</div>
                )}
              </div>
            </section>,
          );
          return res;
        })}

        {/* Screen 5 – Erklärung / Zahlen */}
        <section
          ref={setRef(idxOf("stats"))}
          data-idx={idxOf("stats")}
          className={`story-panel ${active === idxOf("stats") ? "is-active" : ""}`}>
          <div className="panel-inner">
            <h2 className="screen-title">
              Was steckt noch im Datensatz zum Digitalhaushalt?
            </h2>
            <div className="stat-cards">
              <div className="stat-card">
                <span className="stat-num">
                  <CountUp
                    value={data.meta.counts.keywords}
                    active={active === idxOf("stats")}
                  />
                </span>
                <span className="stat-label">
                  Schlagworte, die auf Digitalisierung hinweisen
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-num">
                  <CountUp
                    value={data.meta.counts.titel ?? 0}
                    active={active === idxOf("stats")}
                  />
                </span>
                <span className="stat-label">
                  Haushaltstitel, die ein oder mehrere dieser Schlagworte
                  beinhalten
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-num">≈ 16,7 Mrd €</span>
                <span className="stat-label">
                  sind für den Digitalhaushalt veranschlagt (2025, SOLL)
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-num"> ≈ 3,3%</span>
                <span className="stat-label">
                  des Gesamthaushalts macht dieses Budget aus
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Screen 8 – Call to Action */}
        <section
          ref={setRef(idxOf("cta"))}
          data-idx={idxOf("cta")}
          className={`story-panel cta ${active === idxOf("cta") ? "is-active" : ""}`}>
          <div className="panel-inner center">
            <h2 className="cta-title">Jetzt selbst erkunden</h2>
            <p className="cta-sub">
              Filtere nach Bundesinstitution, Jahr, oder Thema und entdecke,
              welche Begriffe den Digitalhaushalt ausmachen.
            </p>
            <button className="cta-button" onClick={() => setView("explore")}>
              Netzwerk-Explorer öffnen →
            </button>
          </div>
          <p className="cta-imprint">
            <a
              className="imprint-link"
              href="https://www.technologiestiftung-berlin.de/impressum"
              target="_blank"
              rel="noreferrer">
              Impressum
            </a>
          </p>
        </section>
      </div>

      <button className="story-skip" onClick={() => setView("explore")}>
        Intro überspringen
      </button>
    </div>
  );
}
