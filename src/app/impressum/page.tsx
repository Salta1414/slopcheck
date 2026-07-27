import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal-page";
import { siteLegal } from "@/lib/site-legal";

export const metadata: Metadata = {
  title: "Impressum — Slopcheck",
};

export default function ImpressumPage() {
  const { operator, supportEmail, productName, isComplete } = siteLegal;

  return (
    <LegalPage title="Impressum" updated="27. Juli 2026">
      {!isComplete ? (
        <p className="rounded-2xl border-[3px] border-[var(--accent-2)] bg-[var(--accent-2)]/10 px-4 py-3 text-sm font-bold text-[var(--ink)]">
          Hinweis: Platzhalter ersetzen — setze{" "}
          <code className="rounded bg-white px-1">NEXT_PUBLIC_LEGAL_*</code> in
          der Env, bevor du live gehst.
        </p>
      ) : null}

      <LegalSection title="Angaben gemäß § 5 DDG">
        <p>
          {operator.name}
          <br />
          {operator.street}
          <br />
          {operator.zipCity}
          <br />
          {operator.country}
        </p>
      </LegalSection>

      <LegalSection title="Kontakt">
        <p>
          E-Mail:{" "}
          <a
            className="font-extrabold underline decoration-[3px] underline-offset-2"
            href={`mailto:${supportEmail}`}
          >
            {supportEmail}
          </a>
        </p>
        {operator.phone ? <p>Telefon: {operator.phone}</p> : null}
      </LegalSection>

      <LegalSection title="Verantwortlich für den Inhalt">
        <p>
          Verantwortlich nach § 18 Abs. 2 MStV: {operator.name},{" "}
          {operator.street}, {operator.zipCity}.
        </p>
      </LegalSection>

      <LegalSection title="EU-Streitbeilegung">
        <p>
          Die Europäische Kommission stellt eine Plattform zur
          Online-Streitbeilegung (OS) bereit:{" "}
          <a
            className="font-extrabold underline decoration-[3px] underline-offset-2"
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noreferrer"
          >
            https://ec.europa.eu/consumers/odr/
          </a>
          . Wir sind nicht verpflichtet und nicht bereit, an
          Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
          teilzunehmen.
        </p>
      </LegalSection>

      <LegalSection title="Haftung für Inhalte & Links">
        <p>
          Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach
          den allgemeinen Gesetzen verantwortlich. Für fremde Inhalte auf
          verlinkten Websites übernehmen wir keine Gewähr. Für die Inhalte der
          verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich.
        </p>
        <p>
          {productName} bewertet Screenshots fremder Websites. Die Bewertung ist
          eine automatisierte Einschätzung und keine Rechtsberatung.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
