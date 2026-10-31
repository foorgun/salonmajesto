import type { Metadata } from "next";
import { LegalPage } from "../LegalPage";
import { salon } from "@/config/salon";

export const metadata: Metadata = { title: "Impressum", alternates: { canonical: "/impressum" } };

// TODO: prüfen – Angaben vom Inhaber bestätigen lassen
export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum">
      <section>
        <h2>Angaben gemäß § 5 DDG</h2>
        <p>
          {salon.name}
          <br />
          Inhaber: {salon.owner}
          <br />
          {salon.address.street}
          <br />
          {salon.address.zip} {salon.address.city}
        </p>
      </section>
      <section>
        <h2>Kontakt</h2>
        <p>
          Telefon: {salon.phone}
          <br />
          E-Mail: <a href={`mailto:${salon.email}`}>{salon.email}</a>
        </p>
      </section>
      <section>
        <h2>Umsatzsteuer-ID</h2>
        <p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a UStG: {salon.vatId}</p>
      </section>
      <section>
        <h2>Berufsrechtliche Angaben</h2>
        <p>Eintragung in die Handwerksrolle der zuständigen Handwerkskammer. {/* TODO: prüfen */}</p>
      </section>
      <section>
        <h2>Verbraucherstreitbeilegung</h2>
        <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
      </section>
    </LegalPage>
  );
}
