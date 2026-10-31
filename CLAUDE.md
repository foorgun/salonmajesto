# CLAUDE.md – Website Salon Majesto

## Arbeitsmodus
Baue die komplette Website **in einem Durchgang**: kein Phasenplan, keine Rückfragen, keine Zwischenabnahmen.
Wenn eine Info fehlt: sinnvollen Default wählen, in `src/config/salon.ts` als `// TODO: prüfen` markieren und weitermachen.
Am Ende muss `npm run build` fehlerfrei laufen und der Buchungsflow lokal Ende-zu-Ende funktionieren.

## Ziel
1. **Primär:** Terminland.de ablösen – eigene Online-Terminbuchung inkl. Admin-Ansicht für die Barber.
2. **Sekundär:** Marketing & Präsenz – schneller, minimalistischer One-Pager, der auf Google und Instagram gut aussieht.

Leitprinzip: **Minimalismus + Buchen in maximal 4 Schritten.** Auf jeder Seite ist „Termin buchen“ mit 1 Tap erreichbar.

## Design-Referenz
- `design-reference.png` (liegt neben dieser Datei) ist die verbindliche visuelle Vorlage: Desktop-Startseite links, mobiler Buchungsflow rechts, Design-Tokens unten. Nachbauen, nicht neu erfinden.
- `logo.png` → nach `public/logo.png` kopieren und zusätzlich als **SVG nachzeichnen** (`public/logo.svg`, Pfade, `currentColor`), damit es auf hell und dunkel funktioniert. Favicon + OG-Image daraus ableiten.

### Tokens
| Token | Wert | Einsatz |
|---|---|---|
| `paper` | `#EDEDED` | Seitenhintergrund (wie Instagram-Grafiken) |
| `ink` | `#141414` | Text, Primär-Buttons |
| `night` | `#0B0B0C` | Nav, Hero, Footer, Bestätigung |
| `mute` | `#6B6B6B` | Sekundärtext |
| `line` | `#CFCFCF` | 1-px-Trennlinien |

- **Fonts** (selbst gehostet über `next/font` bzw. `@fontsource`, **kein** Google-Fonts-CDN wegen DSGVO):
  - Bodoni Moda 400/500: Headlines (groß, eng: „Preise“, „Team“, „Wann?“)
  - Oswald 600 uppercase: Barber-Namen, kurze Labels (wie „SUAD & YAKUP“ auf Instagram)
  - DM Sans 400/500: Fließtext, UI, Preise (`tabular-nums`)
- Monochrom, **keine Akzentfarbe**. Einzige Ausnahme: grüner Punkt beim Status „Heute geöffnet“.
- Ecken 0–2 px, keine Schatten auf Flächen, 1-px-Linien statt Karten-Boxen, viel Weißraum.
- Buttons: uppercase, `letter-spacing: .14em`, schwarz auf hell bzw. weiß auf dunkel.
- Signatur-Visual: die **Sternenhimmel-Decke** des Salons. Hero = dunkles Interior-Foto mit Verlauf nach Schwarz.
- Bilder im Team-Bereich in Graustufen, beim Hover in Farbe.
- Animation nur dezent (Fade-in beim Scrollen, `prefers-reduced-motion` respektieren).

## Tech-Stack
- **Next.js (App Router, aktuelle Version) + TypeScript + Tailwind CSS**
- **Supabase** (Postgres + Auth) für Buchungen und Admin-Login
- **Resend** für E-Mails (Bestätigung, Storno-Link, Erinnerung 24 h vorher)
- Deployment: **Vercel**; Erinnerungen per Vercel Cron (`/api/cron/reminders`, stündlich)
- Validierung mit `zod`, Datumslogik mit `date-fns` + `date-fns-tz` (Zeitzone `Europe/Berlin`)
- Keine UI-Bibliothek nötig; eigene schlanke Komponenten

## Seitenstruktur
```
/                 One-Pager: Hero · Preise · Team · Salon-Galerie · Instagram-CTA · Info/Kontakt
/termin           Buchungsflow (Query-Params: ?barber=yakup&service=haare-bart vorbelegen)
/termin/bestaetigt/[id]
/termin/storno/[token]   Termin selbst stornieren (bis 2 h vorher)
/admin            Login (Supabase Magic Link) → Tagesansicht
/impressum, /datenschutz
```
- **Hero:** „Heute geöffnet · 09:00–19:00“ (live aus Öffnungszeiten berechnet), H1 „Salon Majesto“, ein Satz, Buttons „Termin buchen“ + „Preise ansehen“. Hinweis: „Mit Termin oder einfach vorbeikommen“.
- **Preise:** zweispaltige Liste mit Linien, CTA „Jetzt buchen“.
- **Team:** 4 Karten, jede mit Link „Bei [Name] buchen →“ → `/termin?barber=…`.
- **Galerie:** 3–6 Interior-/Cut-Fotos, `next/image`, Platzhalter aus `public/images/` (siehe unten).
- **Info:** Adresse + „Route planen“ (Google-Maps-Link, **kein** eingebettetes Iframe), Öffnungszeiten, Telefon, WhatsApp-Link, Instagram @salonmajesto.
- **Mobile:** Sticky-Button „Termin buchen“ am unteren Rand (ausgeblendet auf `/termin`).

## Buchungsflow (ersetzt Terminland)
Eine Seite, 4 Schritte mit Fortschrittsbalken, Zurück-Button, State in der URL (Reload-sicher):

1. **Bei wem?** – „Schnellstmöglich“ (erster freier Slot über alle Barber) · Yakup · Yasin · Enes · Suad
2. **Leistung** – eine Hauptleistung (Radio) + optionale Extras (Checkbox); Summe von Preis & Dauer unten sichtbar
3. **Wann?** – horizontale Tagesleiste (nächste 21 Tage, geschlossene Tage ausgegraut), darunter freie Slots als Grid
4. **Deine Daten** – Name, Telefon (Pflicht), E-Mail (Pflicht für Bestätigung), „Ich war schon mal hier“ (ersetzt Terminland-Frage „Warst du schon einmal in unserem Salon?“), optionale Notiz, Datenschutz-Checkbox → „Verbindlich buchen“

Danach: dunkle Bestätigungsseite („Bis bald, {Vorname}.“) mit Zusammenfassung, „Zum Kalender hinzufügen“ (.ics-Download) und Storno-Link. Bezahlung **vor Ort**, keine Online-Zahlung.

### Slot-Logik
- Raster 15 Min. Slot ist frei, wenn die gesamte Dauer (Leistung + Extras + Puffer 5 Min) in die Arbeitszeit des Barbers passt und sich mit keiner Buchung/Blockzeit überschneidet.
- Mindestvorlauf 60 Min, Buchungshorizont 21 Tage (konfigurierbar).
- „Schnellstmöglich“: Slots aller Barber vereinigen; bei Buchung den Barber mit der geringsten Auslastung an dem Tag zuweisen.
- **Doppelbuchungen auf DB-Ebene verhindern:** `btree_gist` + Exclusion Constraint auf `(barber_id, tstzrange(starts_at, ends_at))` für nicht stornierte Buchungen. Die Server Action fängt den Konflikt ab und zeigt „Dieser Slot wurde gerade vergeben“ + neue Slots.
- Spam-Schutz: Honeypot-Feld + simples Rate-Limit pro IP (z. B. 5 Buchungen/Stunde).

### Datenmodell (Supabase-Migration in `supabase/migrations/`)
- `barbers` (id, slug, name, photo_url, active, sort)
- `services` (id, slug, name, price_cents, duration_min, is_extra, active, sort)
- `working_hours` (barber_id, weekday 0–6, start_time, end_time) – mehrere Zeilen pro Tag erlauben (Pausen)
- `time_off` (barber_id nullable = ganzer Salon, starts_at, ends_at, reason)
- `bookings` (id, barber_id, starts_at, ends_at, customer_name, phone, email, is_returning, note, status `confirmed|cancelled|no_show`, cancel_token, source `online|admin|walk_in`, created_at)
- `booking_services` (booking_id, service_id, price_cents, duration_min) – Preise zum Buchungszeitpunkt einfrieren
- RLS: Öffentlich nur Lesen von `barbers`/`services`/aktive Öffnungszeiten. Verfügbarkeit und Buchung ausschließlich über Server Actions mit Service-Role-Key. Admin-Tabellenzugriff nur für eingeloggte Nutzer in `admins`.
- `supabase/seed.sql` mit allen Daten aus dieser Datei.

### Admin (`/admin`)
Bewusst schlicht, mobil nutzbar (die Barber benutzen das am Handy):
- Tagesansicht als Spalten pro Barber, Datumsnavigation, Termine als Blöcke (Name, Leistung, Telefon als `tel:`-Link)
- Termin anlegen (Walk-in/telefonisch), verschieben, stornieren, als No-Show markieren
- Blockzeiten setzen (Urlaub, Pause, Krankheit) pro Barber oder Salon-weit
- Leistungen/Preise und Arbeitszeiten bearbeiten
- E-Mail an Salon bei jeder neuen Online-Buchung (`SALON_NOTIFY_EMAIL`)

## Inhalte (Seed-Daten)
**Barber:** Yakup, Yasin, Enes, Suad (Suad laut Instagram „wieder da“, im Terminland-Formular aber nicht gelistet → `// TODO: prüfen`). Arbeitszeiten je Barber vorerst = Öffnungszeiten.

**Leistungen** (Preise aus Instagram-Preisliste, Dauern geschätzt → `// TODO: prüfen`):
| Leistung | Preis | Dauer | Typ |
|---|---|---|---|
| Haare | 26 € | 30 | Haupt |
| Bart | 16 € | 20 | Haupt |
| Augenbrauen | 7 € | 10 | Haupt |
| Haare & Bart | 42 € | 45 | Haupt |
| Haare & Augenbrauen | 33 € | 35 | Haupt (Preis geschätzt, TODO) |
| Haare, Bart & Augenbrauen | 49 € | 50 | Haupt |
| Salon Majesto Paket (all inclusive) | 65 € | 70 | Haupt (Inhalt + Preis TODO) |
| + Waschen | 6 € | 10 | Extra |
| Gesichtshaare wachsen | 10 € | 10 | Extra |
| Ohren & Nase wachsen | 6 € | 5 | Extra |
| Färben | auf Anfrage | – | nur auf Preisliste anzeigen, nicht buchbar → WhatsApp-Link |

**Salon-Stammdaten** (alles in `src/config/salon.ts`, Platzhalter mit TODO):
Name „Salon Majesto“, Instagram `https://instagram.com/salonmajesto`, Adresse, Telefon, WhatsApp-Nummer, E-Mail, Öffnungszeiten (Default: Di–Fr 09:00–19:00, Sa 09:00–17:00, So–Mo geschlossen), Google-Maps-Link, Hinweis „Mit und ohne Termin“.

**Tonalität:** Deutsch, du-Form, kurz, selbstbewusst, kein Werbesprech. Beispiele: „Präzise Cuts, saubere Fades, gepflegter Bart.“ · „Mit Termin oder einfach vorbeikommen.“ · „Bis bald, Max.“

## Bilder
`public/images/` mit klar benannten Platzhaltern anlegen (`hero.jpg`, `interior-1.jpg`, `interior-2.jpg`, `cut-1.jpg`, `team-yakup.jpg` …), im Code bereits korrekt verdrahtet. Solange keine echten Fotos da sind: dunkle neutrale Flächen (`night`) mit dezentem Sternenpunkt-Muster per CSS – **keine Stockfotos**. Echte Fotos kommen vom Instagram-Account des Salons.

## SEO & Marketing
- Metadata pro Seite, OG-Image (dunkel, Logo + „Termin buchen“), `sitemap.ts`, `robots.ts`
- JSON-LD `HairSalon` / `BarberShop` mit Adresse, Öffnungszeiten, Preisen (`makesOffer`), `sameAs` Instagram
- Lighthouse-Ziel ≥ 95 in allen Kategorien (mobile)
- Datenschutzfreundliche Analytics optional über `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (nur laden, wenn gesetzt)
- Instagram-Bereich: kein Embed/Feed-Widget (DSGVO, Performance), stattdessen 3 kuratierte Bilder + Button „@salonmajesto folgen“
- Buchungslinks mit UTM-tauglichen Query-Params, damit Instagram-Bio/Story-Links (`/termin?barber=suad`) messbar sind

## Recht (DE)
- Impressum- und Datenschutzseite mit Platzhaltern (Inhaber, Anschrift, USt-ID; Supabase, Resend, Vercel als Auftragsverarbeiter)
- Kein Cookie-Banner nötig, solange nur technisch notwendige Cookies (Admin-Session) gesetzt werden – deshalb keine Third-Party-Embeds
- Buchungsdaten nach 12 Monaten automatisch löschen (Cron)

## Umgebung
`.env.example` anlegen:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
MAIL_FROM="Salon Majesto <termine@DOMAIN>"
SALON_NOTIFY_EMAIL=
NEXT_PUBLIC_SITE_URL=
CRON_SECRET=
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=
```
Ohne `RESEND_API_KEY` werden Mails nur in die Konsole geloggt, damit lokal alles ohne Accounts läuft.

## Qualität
- Tests (Vitest) für die Slot-Berechnung: Arbeitszeit-Grenzen, Pausen, Überschneidungen, Mindestvorlauf, „Schnellstmöglich“, Zeitumstellung (letzter So im März/Oktober)
- Barrierefreiheit: echte `<button>`/`<input type="radio">`, Fokus-Ringe sichtbar, Kontrast AA, Tastatur-bedienbar
- Mobile-first, getestet auf 360 px Breite

## Abschluss
`README.md` mit: Setup (Supabase-Projekt anlegen, Migration + Seed ausführen, Admin-User anlegen), Deploy auf Vercel, Liste aller offenen `TODO: prüfen`-Punkte aus `salon.ts` und dem Seed, sowie Anleitung, wie die Terminland-Links (Instagram-Bio, Google-Unternehmensprofil) auf `/termin` umgestellt werden.
