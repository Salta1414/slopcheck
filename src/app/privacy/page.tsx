import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal-page";
import { siteLegal } from "@/lib/site-legal";

export const metadata: Metadata = {
  title: "Datenschutz — Slopcheck",
};

export default function PrivacyPage() {
  const { operator, supportEmail, productName, priceLabel } = siteLegal;

  return (
    <LegalPage title="Datenschutzerklärung" updated="27. Juli 2026">
      <LegalSection title="1. Verantwortlicher">
        <p>
          Verantwortlicher im Sinne der DSGVO:
          <br />
          {operator.name}
          <br />
          {operator.street}
          <br />
          {operator.zipCity}, {operator.country}
          <br />
          E-Mail:{" "}
          <a
            className="font-extrabold underline decoration-[3px] underline-offset-2"
            href={`mailto:${supportEmail}`}
          >
            {supportEmail}
          </a>
        </p>
      </LegalSection>

      <LegalSection title="2. Überblick der Verarbeitung">
        <p>
          {productName} analysiert öffentlich erreichbare Website-URLs: Wir
          erstellen Screenshots, speichern Scan-Ergebnisse und — nach
          Registrierung und Zahlung — den vollständigen Review.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Gast-Scans lokal im Browser (localStorage)</li>
          <li>Account-Daten über Clerk (Authentifizierung)</li>
          <li>Scan- & Review-Daten in unserer Backend-Datenbank (Convex)</li>
          <li>Zahlungen über Stripe ({priceLabel} Full Review)</li>
          <li>KI-Auswertung über OpenRouter (Vision-Modelle)</li>
          <li>Screenshot-Erstellung über Browserless / Fallback-Anbieter</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Rechtsgrundlagen">
        <p>
          Art. 6 Abs. 1 lit. b DSGVO (Vertrag / vorvertragliche Maßnahmen) für
          Account, Scans und bezahlte Reviews. Art. 6 Abs. 1 lit. f DSGVO
          (berechtigtes Interesse) für Sicherheit, Missbrauchsschutz und
          Produktverbesserung. Art. 6 Abs. 1 lit. a DSGVO, soweit Einwilligungen
          erforderlich sind (z. B. optionale Cookies von Drittanbietern).
        </p>
      </LegalSection>

      <LegalSection title="4. Hosting & Backend">
        <p>
          Die Anwendung wird über Vercel bzw. vergleichbare Hosting-Anbieter
          bereitgestellt. Backend und Datenbank laufen über Convex. Dabei können
          Serverstandorte in der EU und/oder den USA genutzt werden. Soweit
          erforderlich, stützen wir Übermittlungen auf geeignete Garantien (z. B.
          Standardvertragsklauseln).
        </p>
      </LegalSection>

      <LegalSection title="5. Authentifizierung (Clerk)">
        <p>
          Login und Registrierung erfolgen über Clerk. Dabei werden u. a.
          E-Mail-Adresse, Name und Authentifizierungsdaten verarbeitet. Details:
          Datenschutzerklärung von Clerk. Wir speichern eine Referenz auf dein
          Nutzerkonto in unserer Datenbank.
        </p>
      </LegalSection>

      <LegalSection title="6. Zahlungen (Stripe)">
        <p>
          Für den Kauf des Full Reviews ({priceLabel}) nutzen wir Stripe. Kartendaten
          werden direkt von Stripe verarbeitet — wir speichern keine
          vollständigen Zahlungsdaten. Verarbeitet werden u. a. Transaktions-ID,
          Betrag, Status und Zuordnung zum Scan.
        </p>
      </LegalSection>

      <LegalSection title="7. Screenshots & KI-Analyse">
        <p>
          Zur Analyse rufen wir die von dir angegebene URL ab und erzeugen
          Screenshots (Browserless und ggf. Fallback-Dienste). Die Bilder sowie
          die URL werden an Modelle über OpenRouter übermittelt, um einen
          UI-„Slop“-Score und Findings zu erzeugen.
        </p>
        <p>
          Bitte scanne nur Websites, zu deren Prüfung du berechtigt bist.
          Öffentlich sichtbare Inhalte der Zielseite können kurzzeitig bei
          Auftragsverarbeitern landen.
        </p>
      </LegalSection>

      <LegalSection title="8. Speicherdauer">
        <p>
          Gast-Scans bleiben in deinem Browser, bis du sie löschst oder sie
          nach Login übernommen werden. Account-Scans und Reviews speichern wir,
          solange dein Konto aktiv ist bzw. bis du Löschung verlangst —
          gesetzliche Aufbewahrungspflichten (z. B. Zahlungsbelege) bleiben
          unberührt.
        </p>
      </LegalSection>

      <LegalSection title="9. Deine Rechte">
        <p>
          Du hast das Recht auf Auskunft, Berichtigung, Löschung,
          Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch
          gegen Verarbeitungen auf Basis von Art. 6 Abs. 1 lit. f DSGVO. Außerdem
          kannst du dich bei einer Aufsichtsbehörde beschweren.
        </p>
        <p>
          Kontakt für Datenschutzanfragen:{" "}
          <a
            className="font-extrabold underline decoration-[3px] underline-offset-2"
            href={`mailto:${supportEmail}`}
          >
            {supportEmail}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="10. Keine Pflichtangabe / Minderjährige">
        <p>
          Die Nutzung ist nicht für Kinder unter 16 Jahren bestimmt. Pflichtfelder
          ergeben sich aus dem jeweiligen Formular bzw. dem Kaufprozess.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
