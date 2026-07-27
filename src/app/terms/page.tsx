import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal-page";
import { siteLegal } from "@/lib/site-legal";

export const metadata: Metadata = {
  title: "AGB — Slopcheck",
};

export default function TermsPage() {
  const { operator, supportEmail, productName, priceLabel } = siteLegal;

  return (
    <LegalPage title="Allgemeine Geschäftsbedingungen" updated="27. Juli 2026">
      <LegalSection title="1. Geltungsbereich">
        <p>
          Diese AGB gelten für die Nutzung von {productName} und den Kauf des
          kostenpflichtigen Full Reviews zwischen dir und {operator.name} (
          {operator.zipCity}).
        </p>
      </LegalSection>

      <LegalSection title="2. Leistungen">
        <p>
          {productName} bietet eine automatisierte UI-Einschätzung („Slop
          Score“) auf Basis von Screenshots einer von dir angegebenen URL. Der
          kostenlose Pre-Check liefert eine Schätzung und Teaser. Der
          kostenpflichtige Full Review enthält detaillierte Findings und
          Fix-Prompts.
        </p>
        <p>
          Die Ergebnisse sind subjektive, modellbasierte Einschätzungen — kein
          Design-Audit mit Garantie, keine Rechtsberatung und keine Zusicherung
          bestimmter Conversion- oder SEO-Effekte.
        </p>
      </LegalSection>

      <LegalSection title="3. Vertragsschluss & Preis">
        <p>
          Der Full Review kostet {priceLabel} (ggf. zzgl. gesetzlicher Steuern,
          sofern ausgewiesen). Der Vertrag kommt mit erfolgreichem Abschluss des
          Stripe-Checkouts zustande. Danach wird die Analyse gestartet und im
          Account bereitgestellt.
        </p>
      </LegalSection>

      <LegalSection title="4. Widerruf für Verbraucher">
        <p>
          Als Verbraucher steht dir grundsätzlich ein Widerrufsrecht zu. Bei
          digitalen Inhalten, die nicht auf einem körperlichen Datenträger
          geliefert werden, erlischt das Widerrufsrecht, wenn du ausdrücklich
          zugestimmt hast, dass wir vor Ablauf der Widerrufsfrist mit der
          Ausführung beginnen, und du bestätigt hast, dass du dein
          Widerrufsrecht damit verlierst (Art. 16 lit. m Verbraucherrechte-RL /
          § 356 Abs. 5 BGB).
        </p>
        <p>
          Mit dem Kauf des Full Reviews und dem Start der Analyse stimmst du der
          sofortigen Ausführung zu. Sobald die Analyse gelaufen ist bzw. der
          Report bereitsteht, entfällt das Widerrufsrecht für diese Leistung.
        </p>
      </LegalSection>

      <LegalSection title="5. Nutzerpflichten">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Scanne nur URLs, die du prüfen darfst (eigene Seite oder
            Einwilligung).
          </li>
          <li>Kein Missbrauch, Scraping-Überlast oder rechtswidrige Inhalte.</li>
          <li>
            Account-Zugangsdaten geheim halten; Aktivitäten über dein Konto
            können dir zugerechnet werden.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Verfügbarkeit">
        <p>
          Wir bemühen uns um hohe Verfügbarkeit, schulden aber keine
          unterbrechungsfreie Nutzung. Screenshot- oder KI-Ausfälle können zu
          Verzögerungen oder Fehlermeldungen führen. Bei technischen Fehlern nach
          Zahlung bemühen wir uns um Nachholung oder Erstattung nach billigem
          Ermessen.
        </p>
      </LegalSection>

      <LegalSection title="7. Haftung">
        <p>
          Wir haften unbeschränkt bei Vorsatz, grober Fahrlässigkeit und nach dem
          Produkthaftungsgesetz sowie bei Verletzung von Leben, Körper oder
          Gesundheit. Bei leichter Fahrlässigkeit haften wir nur bei Verletzung
          wesentlicher Vertragspflichten und begrenzt auf den vorhersehbaren,
          typischen Schaden. Im Übrigen ist die Haftung ausgeschlossen.
        </p>
      </LegalSection>

      <LegalSection title="8. Geistiges Eigentum">
        <p>
          Die Software, Marken und Texte von {productName} bleiben unser
          Eigentum. Die gelieferten Prompts und Findings darfst du für deine
          eigenen Projekte nutzen. Die Rechte an der gescannten Website verbleiben
          bei deren Rechteinhabern.
        </p>
      </LegalSection>

      <LegalSection title="9. Änderungen">
        <p>
          Wir können diese AGB mit Wirkung für die Zukunft anpassen. Bei
          wesentlichen Änderungen informieren wir dich in angemessener Weise.
          Fortgesetzte Nutzung nach Wirksamkeit gilt als Zustimmung, soweit
          gesetzlich zulässig.
        </p>
      </LegalSection>

      <LegalSection title="10. Schlussbestimmungen">
        <p>
          Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des
          UN-Kaufrechts. Zwingende Verbraucherschutzvorschriften am Wohnsitz
          bleiben unberührt. Salvatorische Klausel: Unwirksame Bestimmungen
          berühren die übrigen nicht.
        </p>
        <p>
          Kontakt:{" "}
          <a
            className="font-extrabold underline decoration-[3px] underline-offset-2"
            href={`mailto:${supportEmail}`}
          >
            {supportEmail}
          </a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
