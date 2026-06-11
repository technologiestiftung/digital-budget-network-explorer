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
      }}
    >
      <div className="modal-content">
        <button className="modal-close" onClick={onClose} aria-label="Schließen">
          ×
        </button>

        <h2 className="modal-heading">Über das Projekt</h2>

        <section className="modal-section">
          <h3>Hintergrund</h3>
          <p>
            Diese Netzwerk-Visualisierung ist im Rahmen einer{" "}
            <strong>Challenge der Agora Digitale Transformation</strong>{" "}
            entstanden. Die Agora hat den Digitalhaushalt des Bundes berechnet
            – auf Basis von Haushaltstiteln, die anhand extrahierter
            Schlagwort-Wortstämme als digital klassifiziert wurden.
          </p>
          <a
            className="modal-link"
            href="https://agoradigital.de/projekte/digitalhaushalt/"
            target="_blank"
            rel="noreferrer"
          >
            → Zur Website der Agora
          </a>
        </section>

        <section className="modal-section">
          <h3>Datenaufbereitung &amp; Methode</h3>
          <p>
            Den von der Agora bereitgestellten Rohdatensatz haben wir in einen{" "}
            <strong>Linked-Data-Wissensgraphen</strong> (RDF/Turtle) überführt.
            Jedes Keyword wurde als eigener Begriff modelliert, über
            Ko-Occurrence-Beziehungen mit anderen Keywords verknüpft und den
            jeweiligen Einzelplänen (Ministerien) zugeordnet.
          </p>
          <p>
            Aus den Titel-Beschreibungen haben wir zudem den{" "}
            <strong>Wortkontext</strong> extrahiert – etwa, ob „Cloud" als
            „Cloud-Infrastruktur" oder „Cloud-Dienst" auftritt – und so die
            tatsächliche Verwendung der Schlagworte sichtbar gemacht.
          </p>
        </section>

        <section className="modal-section">
          <h3>Verknüpfung mit Wikidata</h3>
          <p>
            Da der Originaldatensatz keine Wikidata-Referenzen enthielt, haben
            wir diese selbst ergänzt: Die passenden Wikidata-Einträge wurden
            algorithmisch ermittelt (unterstützt durch KI), anschließend manuell
            geprüft und korrigiert. Über <code>sameAs</code>- und{" "}
            <code>exactMatch</code>-Verweise sind die Knoten des Netzwerks nun
            mit der internationalen Wissensdatenbank verbunden –
            Kontextinformationen wie Beschreibungen oder Bilder werden live aus
            der Wikidata-API geladen.
          </p>
        </section>

        <section className="modal-section">
          <h3>Was man entdecken kann</h3>
          <p>
            Der Graph macht sichtbar: Welche Begriffe den Digitalhaushalt
            prägen, welche Themen ressortübergreifend gefördert werden, wo
            einmalige Spezialbegriffe auftauchen und wie sich die thematische
            Konjunktur über die Jahre verschiebt.
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
              rel="noreferrer"
            >
              Technologiestiftung Berlin
            </a>{" "}
            im Rahmen der Challenge realisiert.
          </p>
          <a
            className="modal-link"
            href="https://github.com/technologiestiftung/digital-budget-network-explorer"
            target="_blank"
            rel="noreferrer"
          >
            → Quellcode auf GitHub
          </a>
        </section>

        <footer className="modal-imprint">
          <a
            href="https://www.technologiestiftung-berlin.de/impressum"
            target="_blank"
            rel="noreferrer"
          >
            Impressum
          </a>
        </footer>
      </div>
    </div>
  );
}
