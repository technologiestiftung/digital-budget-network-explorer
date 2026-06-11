import { useEffect, useRef } from "react";

interface Props {
  onClose: () => void;
}

export default function ProjectModal({ onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}>
      <div className="modal-content">
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Schließen">
          ×
        </button>

        <h2 className="modal-heading">Über das Projekt</h2>

        <section className="modal-section">
          <h3>Hintergrund</h3>
          <p>
            Das <strong>Sprachnetzwerk Digitalhaushalt</strong> ist im Rahmen
            der Challenge zum Digitalhaushalt der{" "}
            <strong>Agora Digitale Transformation</strong> entstanden.
            Ausgangspunkt ist der von der Agora berechnete Digitalhaushalt des
            Bundes. Dafür wurden Haushaltstitel anhand verschiedener Methoden
            untersucht und als digital relevant klassifiziert.
          </p>
          <a
            className="modal-link"
            href="https://agoradigital.de/projekte/digitalhaushalt/"
            target="_blank"
            rel="noreferrer">
            → Erfahre hier mehr über den Digitalhaushalt
          </a>
          <p style={{ marginTop: 12 }}>
            Hier wird der Teil des Digitalhaushalts betrachtet, der mittels der
            Methode zur Identifikation von Schlagworten entstanden ist. Die
            Anwendung macht die Semantik dieser Daten als interaktiven
            Wissensgraphen explorierbar und ermöglicht neue Perspektiven auf
            digitale Themen, Akteure und Budgets im Bundeshaushalt.
          </p>
        </section>
        <section className="modal-section">
          <h3>Umsetzung</h3>
          <p>
            Das Projekt wurde von der{" "}
            <a
              className="modal-link"
              href="https://www.technologiestiftung-berlin.de/"
              target="_blank"
              rel="noreferrer">
              Technologiestiftung Berlin
            </a>{" "}
            im Rahmen der Challenge realisiert.
          </p>
          <a
            className="modal-link"
            href="https://github.com/technologiestiftung/digital-budget-network-explorer"
            target="_blank"
            rel="noreferrer">
            → Quellcode auf GitHub
          </a>

          <h4>Datenaufbereitung</h4>
          <p>
            Aus dem von der Agora bereitgestellten Datensatz wurden die
            Schlagwörter extrahiert und bereinigt. Weiterhin wurden Labels zu
            Einzelplänen, Hauptfunktionsgruppen usw. ergänzt.
          </p>
          <p>
            Anschließend wurde der Datensatz in einen{" "}
            <strong>Linked-Data-Wissensgraphen</strong> (RDF/Turtle) überführt.
            Die enthaltenen Schlagworte wurden als eigenständige Konzepte
            modelliert, miteinander verknüpft und den jeweiligen Einzelplänen
            zugeordnet.
          </p>
        </section>

        <section className="modal-section">
          <h4>Verknüpfung mit Wikidata</h4>
          <p>
            Um zusätzliche Kontextinformationen bereitzustellen, wurden die
            Begriffe des Netzwerks mit passenden Einträgen in{" "}
            <strong>Wikidata</strong> verknüpft. Die Zuordnung erfolgte zunächst
            algorithmisch, unterstützt durch KI-Verfahren, und wurde
            anschließend manuell überprüft und korrigiert.
          </p>
          <p>
            Dadurch können ergänzende Informationen wie Beschreibungen, Bilder
            oder weiterführende Verweise direkt aus Wikidata eingebunden werden.
          </p>
        </section>

        <section className="modal-section">
          <h3>Was die Anwendung zeigt</h3>
          <p>Der Graph macht sichtbar,</p>
          <ul className="modal-list">
            <li>welche Themen den Digitalhaushalt prägen,</li>
            <li>welche Begriffe häufig gemeinsam auftreten,</li>
            <li>welche Themen ressortübergreifend gefördert werden,</li>
            <li>welche spezialisierten Nischenthemen existieren,</li>
            <li>
              und wie sich thematische Schwerpunkte über die Zeit verändern.
            </li>
          </ul>
          <p>
            Die Anwendung versteht sich dabei nicht als klassisches
            Recherchewerkzeug, sondern als Explorations- und Analyseumgebung für
            Muster, Zusammenhänge und Auffälligkeiten.
          </p>
        </section>

        <section className="modal-section">
          <h3>Hinweise zur Interpretation</h3>

          <h4>Der Digitalhaushalt ist eine Schätzung</h4>
          <p>
            Die Grundlage dieser Anwendung ist nicht der Bundeshaushalt selbst,
            sondern der von der Agora Digitale Transformation berechnete
            Digitalhaushalt. Dieser basiert auf einer methodischen Auswertung
            von Haushaltstiteln und stellt eine fundierte Schätzung dar. Die
            zugrunde liegende Methodik wird von der Agora ausführlich
            dokumentiert und erläutert.
          </p>

          <h4>
            Begriffe wurden zusammengeführt – aber nicht vollständig
            vereinheitlicht
          </h4>
          <p>
            Um die Daten analysierbar zu machen, mussten ähnliche Begriffe
            teilweise zusammengeführt werden. Dabei entsteht ein Spannungsfeld
            zwischen Vereinfachung und Genauigkeit.
          </p>
          <p>
            Beispielsweise sollen unterschiedliche Wortformen wie "digital" und
            "digitale" gemeinsam betrachtet werden. Gleichzeitig soll die
            fachliche Differenzierung erhalten bleiben. Deshalb werden
            spezialisierte Begriffe häufig weiterhin separat dargestellt.
          </p>
          <p>
            Das bedeutet: Nicht alle Themen, die inhaltlich zu einem Oberbegriff
            gehören, erscheinen zwangsläufig unter demselben Knoten. So finden
            sich beispielsweise neben "Künstliche Intelligenz" auch
            eigenständige Begriffe wie "KI-Forschung", "KI-Innovationen" oder
            andere spezialisierte Ausprägungen.
          </p>
          <p>
            Die Exploration des Graphen lohnt sich daher oft über mehrere
            verwandte Begriffe hinweg und wir empfehlen die Nutzung der
            Suchfunktion nach speziellen Schlagworten.
          </p>

          <h4>Budgetsummen sind keine Ausgaben für einzelne Themen</h4>
          <p>
            Bei einigen Ansichten werden Budgetsummen für Begriffe aggregiert.
            Diese Werte sollten mit Vorsicht interpretiert werden.
          </p>
          <p>
            Wenn beispielsweise alle Haushaltstitel addiert werden, in denen das
            Schlagwort "Software" vorkommt, bedeutet dies nicht, dass die
            gesamte ausgewiesene Summe ausschließlich für Software ausgegeben
            wird. Ein Haushaltstitel kann mehrere Themen gleichzeitig umfassen,
            von denen ein Begriff nur einen Teil beschreibt.
          </p>
          <p>
            Die dargestellten Budgets zeigen daher vor allem die finanzielle
            Größenordnung der Haushaltstitel, in denen ein Begriff vorkommt –
            nicht die tatsächlichen Ausgaben für das jeweilige Thema.
          </p>

          <h4>Prototyp mit begrenzter Entwicklungszeit</h4>
          <p>
            Die Anwendung wurde im Rahmen einer zeitlich begrenzten Challenge
            entwickelt und ist als <strong>Prototyp</strong> zu verstehen. Trotz
            sorgfältiger Datenaufbereitung, manueller Qualitätssicherung und
            Plausibilitätsprüfungen können Fehler, unvollständige oder
            fehlerhafte Zuordnungen (insbesondere bei den Wikimedia-
            Verlinkungen) oder unerwartete Darstellungen auftreten.
          </p>
          <p>
            Wir freuen uns über Hinweise, Verbesserungsvorschläge und
            Diskussionen zur Methodik.
          </p>
        </section>

        <footer className="modal-imprint">
          <a
            href="https://www.technologiestiftung-berlin.de/impressum"
            target="_blank"
            rel="noreferrer">
            Impressum
          </a>
        </footer>
      </div>
    </div>
  );
}
