import type { Metadata } from "next";
import { LegalPage } from "../LegalPage";
import { bookingConfig, salon } from "@/config/salon";

export const metadata: Metadata = { title: "Datenschutz", alternates: { canonical: "/datenschutz" } };

// TODO: prüfen – Text vor Livegang rechtlich prüfen lassen
export default function DatenschutzPage() {
  const analytics = !!process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  return (
    <LegalPage title="Datenschutz">
      <section>
        <h2>1. Verantwortlicher</h2>
        <p>
          {salon.name}, {salon.owner}, {salon.address.street}, {salon.address.zip} {salon.address.city}. E-Mail:{" "}
          <a href={`mailto:${salon.email}`}>{salon.email}</a>, Telefon: {salon.phone}.
        </p>
      </section>
      <section>
        <h2>2. Online-Terminbuchung</h2>
        <p>
          Wenn du online einen Termin buchst, verarbeiten wir Name, Telefonnummer, E-Mail-Adresse, die Angabe, ob du schon einmal
          bei uns warst, deine optionale Notiz sowie Termin, Barber und Leistung. Zweck: Durchführung des Termins, Bestätigung,
          Erinnerung 24 Stunden vorher und Storno-Möglichkeit. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertrag bzw.
          vorvertragliche Maßnahmen).
        </p>
        <p>
          Buchungsdaten werden {bookingConfig.retentionMonths} Monate nach dem Termin automatisch gelöscht, soweit keine
          gesetzlichen Aufbewahrungspflichten entgegenstehen.
        </p>
        <p>
          Zum Schutz vor Missbrauch wird deine IP-Adresse kurzzeitig im Arbeitsspeicher verarbeitet (Begrenzung der Anzahl von
          Buchungen pro Stunde) und nicht dauerhaft gespeichert. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.
        </p>
      </section>
      <section>
        <h2>3. Auftragsverarbeiter</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium">Vercel Inc.</strong> (Hosting der Website). Beim Aufruf werden technisch notwendige
            Server-Logdaten (z. B. IP-Adresse, Zeitpunkt, aufgerufene Seite) verarbeitet.
          </li>
          <li>
            <strong className="font-medium">Supabase Inc.</strong> (Datenbank für Termine und Team-Login). Datenstandort: EU
            (Frankfurt). {/* TODO: prüfen – Region des Supabase-Projekts */}
          </li>
          <li>
            <strong className="font-medium">Resend</strong> (Versand von Bestätigungs-, Erinnerungs- und Storno-E-Mails).
          </li>
        </ul>
        <p>
          Mit allen Anbietern bestehen Verträge zur Auftragsverarbeitung (Art. 28 DSGVO). Soweit Daten in die USA übermittelt
          werden, erfolgt dies auf Grundlage des EU-US Data Privacy Framework bzw. von Standardvertragsklauseln.
        </p>
      </section>
      <section>
        <h2>4. Cookies, Schriften, Einbettungen</h2>
        <p>
          Wir setzen keine Tracking-Cookies. Lediglich für den Login des Salon-Teams wird ein technisch notwendiges Session-Cookie
          gesetzt. Schriftarten werden von unserem eigenen Server geladen, nicht von Google. Es gibt keine eingebetteten Inhalte
          von Instagram oder Google Maps; Links zu diesen Diensten öffnen erst nach deinem Klick deren Seiten.
        </p>
        {analytics && (
          <p>
            Für anonyme Reichweitenmessung nutzen wir Plausible Analytics (EU-Server, ohne Cookies, ohne Speicherung
            personenbezogener Daten). Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.
          </p>
        )}
      </section>
      <section>
        <h2>5. Deine Rechte</h2>
        <p>
          Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und
          Widerspruch (Art. 15–21 DSGVO) sowie das Recht auf Beschwerde bei einer Datenschutz-Aufsichtsbehörde. Schreib uns
          einfach an <a href={`mailto:${salon.email}`}>{salon.email}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
