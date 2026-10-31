# Salon Majesto – Website & Online-Terminbuchung

One-Pager + eigene Terminbuchung (ersetzt Terminland.de) + Admin für die Barber.
Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase · Resend · Vercel.

## Lokal starten (ohne Accounts)

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # Slot-Logik (Vitest)
npm run build
```

Ohne Supabase-Variablen läuft alles mit einem **lokalen Datei-Store** (`.data/db.json`, wird beim ersten Aufruf aus `src/config/salon.ts` befüllt; zum Zurücksetzen einfach löschen).
Ohne `RESEND_API_KEY` werden alle E-Mails nur in der Konsole ausgegeben.
Im Dev-Modus ist `/admin` ohne Login erreichbar (mit Hinweis-Banner). In Produktion ist Supabase Pflicht.

## Setup Produktion

### 1. Supabase
1. Projekt anlegen (Region **Frankfurt / eu-central-1**).
2. SQL-Editor: `supabase/migrations/20261031000000_init.sql` ausführen, danach `supabase/seed.sql`.
   (Mit Supabase CLI: `supabase link` → `supabase db push` → Seed ausführen.)
3. **Admin-User anlegen:** Authentication → Users → „Add user“ (E-Mail des Barbers, „Auto Confirm“).
   Dann im SQL-Editor:
   ```sql
   insert into public.admins (user_id, email)
   select id, email from auth.users where email = 'barber@example.com';
   ```
   Für jeden Barber wiederholen. Neue Nutzer können sich nicht selbst registrieren.
4. Authentication → URL Configuration: Site URL = Domain, Redirect URL `https://DOMAIN/auth/callback` hinzufügen.
5. Project Settings → API: URL, `anon`-Key und `service_role`-Key für die Umgebungsvariablen kopieren.

### 2. Resend
Domain verifizieren (DNS-Einträge), API-Key erzeugen, `MAIL_FROM` auf eine Adresse dieser Domain setzen.
Empfehlung: in Supabase unter Auth → SMTP ebenfalls Resend eintragen, damit die Login-Links zuverlässig ankommen.

### 3. Vercel
1. Repo importieren, Umgebungsvariablen aus `.env.example` setzen:
   - `NEXT_PUBLIC_SITE_URL` = `https://DOMAIN` (ohne Slash am Ende)
   - `CRON_SECRET` = langer Zufallswert (Vercel schickt ihn automatisch an die Cron-Routen)
   - `SALON_NOTIFY_EMAIL` = Adresse, die bei jeder Online-Buchung benachrichtigt wird
   - `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` optional (nur dann wird Plausible geladen)
2. Deploy. `vercel.json` richtet die Crons ein:
   - `/api/cron/reminders` stündlich: Erinnerung 24 h vorher
   - `/api/cron/cleanup` täglich: Buchungen älter als 12 Monate löschen
   (Hinweis: Stündliche Crons brauchen einen Vercel-Pro-Plan; auf Hobby nur täglich.)
3. Domain verbinden.

## Fotos
Echte Bilder (vom Instagram-Account) nach `public/images/` legen. Dateinamen siehe `public/images/README.md`.
Bis dahin zeigt die Seite dunkle Sternenhimmel-Platzhalter. Bilder je Barber lassen sich auch über `photo_url` in der Tabelle `barbers` setzen.

## Terminland ablösen
1. Seite live schalten und einen Testtermin buchen + stornieren.
2. **Instagram-Bio:** Link auf `https://DOMAIN/termin?utm_source=instagram&utm_medium=bio` ändern.
   Für Stories mit Barber vorausgewählt: `https://DOMAIN/termin?barber=suad&utm_source=instagram&utm_medium=story`.
   Weitere vorbelegbare Parameter: `service=haare-bart`, `extras=waschen`.
3. **Google-Unternehmensprofil:** Bearbeiten → „Termin-Link“ bzw. „Buchungen“ → `https://DOMAIN/termin?utm_source=google&utm_medium=gbp`. Website-Link auf `https://DOMAIN`.
4. Bereits in Terminland gebuchte Termine im Admin unter „+ Termin anlegen“ übernehmen (Quelle „Telefon“).
5. Ein paar Wochen parallel laufen lassen, Terminland-Buchung dann deaktivieren und ggf. auf `/termin` weiterleiten lassen.

## Admin (`/admin`)
Tagesansicht pro Barber, Datumsnavigation, Termine anlegen (Walk-in/Telefon), verschieben, stornieren (Kunde erhält Mail), No-Show.
Blockzeiten pro Barber oder salonweit. Unter „Einstellungen“: Preise, Dauern, Leistungen aktiv/inaktiv, Arbeitszeiten (mit Pausen).
Änderungen an Preisen erscheinen sofort auf der Startseite.

## Architektur
| Pfad | Inhalt |
|---|---|
| `src/config/salon.ts` | Stammdaten, Öffnungszeiten, Buchungsregeln, Seed-Daten |
| `src/lib/slots.ts` | reine Slot-Berechnung (getestet in `tests/slots.test.ts`) |
| `src/lib/booking.ts` | Verfügbarkeit, Barber-Zuweisung „Schnellstmöglich“, Rate-Limit |
| `src/lib/db/` | `Repo`-Interface, Supabase- und lokale Implementierung |
| `src/app/termin/` | Buchungsflow (4 Schritte, State in der URL), Bestätigung, Storno |
| `src/app/admin/` | Admin + Server Actions |
| `supabase/` | Migration (inkl. Exclusion Constraint gegen Doppelbuchungen) + Seed |

Doppelbuchungen verhindert die Datenbank (`btree_gist` + Exclusion Constraint auf `(barber_id, tstzrange)`); die Server Action fängt den Konflikt ab und zeigt sofort neue freie Slots.

## Offene Punkte (`TODO: prüfen`)
**`src/config/salon.ts`**
- [x] Adresse (Walfischgasse 1, 89073 Ulm) und Telefon (0178 2521990)
- [ ] WhatsApp: angenommen über die Handynummer 0178 2521990
- [ ] E-Mail-Adresse
- [ ] Google-Maps-Link: aktuell Suche nach Name + Adresse; besser den Link aus dem Unternehmensprofil
- [ ] Inhaber und USt-IdNr. (Impressum)
- [ ] Öffnungszeiten (Default Di–Fr 09–19, Sa 09–17, So–Mo geschlossen)
- [ ] Suad: wieder aktiv? (Instagram „wieder da“, im Terminland-Formular nicht gelistet). Sonst im Admin bzw. per SQL `active = false`
- [ ] Dauern aller Leistungen (geschätzt)
- [ ] Preis „Haare & Augenbrauen“ (33 € geschätzt)
- [ ] Inhalt und Preis „Salon Majesto Paket“

**`supabase/seed.sql`**: dieselben Punkte (Barber, Dauern, Preise) + Arbeitszeiten je Barber (vorerst = Öffnungszeiten)

**Rechtliches**
- [ ] Impressum: Handwerkskammer/Handwerksrolle bestätigen
- [ ] Datenschutzerklärung rechtlich prüfen lassen, Supabase-Region bestätigen
- [ ] AV-Verträge mit Vercel, Supabase, Resend abschließen

**Design**
- [ ] `public/logo.svg` ist eine Nachzeichnung (Emblem als Pfade, Schriftzug als Text in Bodoni). Für Druck/Beschilderung den Schriftzug professionell vektorisieren lassen.
- [ ] Echte Fotos nach `public/images/` legen

## Hinweise
- Das Rate-Limit (5 Buchungen/Stunde/IP) liegt im Speicher der jeweiligen Server-Instanz. Für einen kleinen Salon reicht das. Bei Missbrauch auf Vercel KV/Upstash umstellen.
- Zeitzone überall `Europe/Berlin`, inkl. Sommer-/Winterzeit (siehe Tests).
