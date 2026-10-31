import Link from "next/link";
import { createAdminBooking, createTimeOff, deleteTimeOff, moveBooking, sendMagicLink, setStatus } from "./actions";
import { getAdmin, isAuthConfigured } from "@/lib/auth";
import { repo } from "@/lib/db";
import { WEEKDAYS_LONG } from "@/lib/hours";
import { berlinDate, berlinTime, berlinToUtc, euro, formatBerlin, isValidDate, shiftDate, weekdayOf } from "@/lib/time";
import type { Booking } from "@/lib/types";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | undefined>>;

const PX_PER_MIN = 1.4;
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export default async function AdminPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const admin = await getAdmin();
  if (!admin) return <Login sent={!!sp.sent} msg={sp.msg} />;

  const today = berlinDate(new Date());
  const date = isValidDate(sp.date) ? sp.date : today;
  const from = berlinToUtc(date, "00:00").toISOString();
  const to = berlinToUtc(shiftDate(date, 1), "00:00").toISOString();

  const [barbers, services, workingHours, bookings, timeOff] = await Promise.all([
    repo.listBarbers(),
    repo.listServices(),
    repo.listWorkingHours(),
    repo.listBookings(from, to),
    repo.listTimeOff(from, to),
  ]);

  const wd = weekdayOf(date);
  const dayHours = workingHours.filter((w) => w.weekday === wd);
  const startMin = Math.min(9 * 60, ...dayHours.map((w) => toMin(w.start_time)), ...bookings.map((b) => toMin(berlinTime(b.starts_at))));
  const endMin = Math.max(19 * 60, ...dayHours.map((w) => toMin(w.end_time)), ...bookings.map((b) => toMin(berlinTime(b.ends_at)) || 24 * 60));
  const gridStart = Math.floor(startMin / 60) * 60;
  const gridEnd = Math.ceil(endMin / 60) * 60;
  const hours = Array.from({ length: (gridEnd - gridStart) / 60 }, (_, i) => gridStart / 60 + i);
  const height = (gridEnd - gridStart) * PX_PER_MIN;

  // Position innerhalb des Tages, auf das Raster begrenzt
  const pos = (startIso: string, endIso: string) => {
    const s = Math.max(gridStart, berlinDate(startIso) < date ? 0 : toMin(berlinTime(startIso)));
    const e = Math.min(gridEnd, berlinDate(endIso) > date ? 24 * 60 : toMin(berlinTime(endIso)));
    return { top: (s - gridStart) * PX_PER_MIN, height: Math.max(18, (e - s) * PX_PER_MIN) };
  };

  const active = bookings.filter((b) => b.status !== "cancelled");
  const revenue = active.filter((b) => b.status === "confirmed").reduce((s, b) => s + b.services.reduce((x, y) => x + y.price_cents, 0), 0);
  const barberName = (id: string | null) => (id ? barbers.find((b) => b.id === id)?.name ?? "?" : "Ganzer Salon");
  const mainServices = services.filter((s) => !s.is_extra);
  const extras = services.filter((s) => s.is_extra);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      {sp.msg && (
        <p role="status" className="mb-4 border-l-2 border-ink bg-white/60 px-3 py-2 text-sm">
          {sp.msg}
        </p>
      )}

      {/* Datumsnavigation */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">{date === today ? "Heute" : WEEKDAYS_LONG[wd]}</p>
          <h1 className="headline mt-1 text-4xl md:text-5xl">{formatBerlin(berlinToUtc(date, "12:00"), "EEE d. MMMM")}</h1>
          <p className="mt-1 text-sm text-mute">
            {active.length} Termine · {euro(revenue)} erwartet
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin?date=${shiftDate(date, -1)}`} className="btn border border-line px-3 py-2" aria-label="Vorheriger Tag">
            ←
          </Link>
          <Link href="/admin" className="btn border border-line px-3 py-2">
            Heute
          </Link>
          <Link href={`/admin?date=${shiftDate(date, 1)}`} className="btn border border-line px-3 py-2" aria-label="Nächster Tag">
            →
          </Link>
          <form className="flex">
            <label htmlFor="jump" className="sr-only">
              Datum wählen
            </label>
            <input id="jump" type="date" name="date" defaultValue={date} className="border border-line bg-transparent px-2 py-1.5 text-sm" />
            <button className="btn border border-l-0 border-line px-3 py-2">Los</button>
          </form>
        </div>
      </div>

      {/* Tagesansicht: Spalten pro Barber */}
      <div className="no-scrollbar mt-6 overflow-x-auto border-y border-line">
        <div className="grid min-w-[640px]" style={{ gridTemplateColumns: `3rem repeat(${barbers.length}, minmax(140px, 1fr))` }}>
          <div />
          {barbers.map((b) => (
            <div key={b.id} className="border-l border-line px-2 py-2 font-label text-sm font-semibold uppercase tracking-wide">
              {b.name}
            </div>
          ))}

          <div className="relative" style={{ height }}>
            {hours.map((h) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-mute" style={{ top: (h * 60 - gridStart) * PX_PER_MIN }}>
                {String(h).padStart(2, "0")}:00
              </span>
            ))}
          </div>

          {barbers.map((b) => {
            const work = dayHours.filter((w) => w.barber_id === b.id);
            return (
              <div key={b.id} className="relative border-l border-line bg-line/40" style={{ height }}>
                {work.map((w, i) => (
                  <div
                    key={i}
                    className="absolute inset-x-0 bg-paper"
                    style={{ top: (toMin(w.start_time) - gridStart) * PX_PER_MIN, height: (toMin(w.end_time) - toMin(w.start_time)) * PX_PER_MIN }}
                  />
                ))}
                {hours.map((h) => (
                  <div key={h} className="absolute inset-x-0 border-t border-line/70" style={{ top: (h * 60 - gridStart) * PX_PER_MIN }} />
                ))}
                {timeOff
                  .filter((t) => t.barber_id === null || t.barber_id === b.id)
                  .map((t) => (
                    <div
                      key={t.id}
                      className="absolute inset-x-0 overflow-hidden bg-[repeating-linear-gradient(45deg,#cfcfcf_0,#cfcfcf_2px,transparent_2px,transparent_8px)] px-2 py-1 text-[11px] text-mute"
                      style={pos(t.starts_at, t.ends_at)}
                    >
                      {t.reason || "Blockiert"}
                    </div>
                  ))}
                {active
                  .filter((x) => x.barber_id === b.id)
                  .map((x) => (
                    <a
                      key={x.id}
                      href={`#b-${x.id}`}
                      className={`absolute inset-x-1 overflow-hidden border-l-2 px-2 py-1 text-[11px] leading-tight ${
                        x.status === "no_show" ? "border-mute bg-line text-mute line-through" : "border-paper bg-ink text-paper hover:bg-night"
                      }`}
                      style={pos(x.starts_at, x.ends_at)}
                    >
                      <span className="tabular-nums">{berlinTime(x.starts_at)}</span> <strong className="font-medium">{x.customer_name}</strong>
                      <span className="block truncate opacity-75">{x.services.map((s) => s.name).join(", ")}</span>
                    </a>
                  ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Terminliste mit Aktionen */}
      <section className="mt-10" aria-labelledby="list-title">
        <h2 id="list-title" className="label">
          Termine
        </h2>
        {bookings.length === 0 && <p className="mt-3 text-sm text-mute">Keine Termine an diesem Tag.</p>}
        <ul className="mt-3 border-t border-line">
          {bookings.map((x) => (
            <BookingRow key={x.id} b={x} date={date} barberName={barberName(x.barber_id)} barbers={barbers} />
          ))}
        </ul>
      </section>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {/* Termin anlegen */}
        <details className="border border-line p-4">
          <summary className="cursor-pointer font-medium">+ Termin anlegen (Walk-in / Telefon)</summary>
          <form action={createAdminBooking} className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Select name="barber_id" label="Barber" options={barbers.map((b) => [b.id, b.name])} />
            <Select name="source" label="Quelle" options={[["admin", "Telefon"], ["walk_in", "Walk-in"]]} />
            <Select name="service" label="Leistung" options={mainServices.map((s) => [s.slug, `${s.name} (${s.duration_min} Min)`])} className="col-span-2" />
            <fieldset className="col-span-2 flex flex-wrap gap-x-4 gap-y-1">
              <legend className="label mb-1">Extras</legend>
              {extras.map((s) => (
                <label key={s.slug} className="flex items-center gap-1.5">
                  <input type="checkbox" name="extras" value={s.slug} className="accent-ink" /> {s.name}
                </label>
              ))}
            </fieldset>
            <Input name="date" label="Datum" type="date" defaultValue={date} required />
            <Input name="time" label="Uhrzeit" type="time" step={300} required />
            <Input name="name" label="Name" placeholder="Walk-in" />
            <Input name="phone" label="Telefon" type="tel" />
            <Input name="email" label="E-Mail (optional)" type="email" className="col-span-2" />
            <Input name="note" label="Notiz" className="col-span-2" />
            <button className="btn btn-dark col-span-2">Termin speichern</button>
          </form>
        </details>

        {/* Blockzeiten */}
        <details className="border border-line p-4">
          <summary className="cursor-pointer font-medium">+ Blockzeit (Urlaub, Pause, Krankheit)</summary>
          <form action={createTimeOff} className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Select name="barber_id" label="Für" options={[["", "Ganzer Salon"], ...barbers.map((b) => [b.id, b.name] as [string, string])]} className="col-span-2" />
            <Input name="from_date" label="Von (Datum)" type="date" defaultValue={date} required />
            <Input name="from_time" label="Von (Uhrzeit, leer = ganzer Tag)" type="time" />
            <Input name="to_date" label="Bis (Datum)" type="date" defaultValue={date} />
            <Input name="to_time" label="Bis (Uhrzeit)" type="time" />
            <Input name="reason" label="Grund" placeholder="Urlaub" className="col-span-2" />
            <button className="btn btn-dark col-span-2">Blockzeit speichern</button>
          </form>
          {timeOff.length > 0 && (
            <ul className="mt-6 border-t border-line text-sm">
              {timeOff.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 border-b border-line py-2">
                  <span>
                    {barberName(t.barber_id)} · {formatBerlin(t.starts_at, "d.M. HH:mm")} – {formatBerlin(t.ends_at, "d.M. HH:mm")}
                    {t.reason && <span className="text-mute"> · {t.reason}</span>}
                  </span>
                  <form action={deleteTimeOff.bind(null, t.id, date)}>
                    <button className="text-xs underline underline-offset-2">Löschen</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </details>
      </div>
      {!isAuthConfigured && !admin.dev && <p className="mt-6 text-sm">Supabase ist nicht konfiguriert.</p>}
    </main>
  );
}

function BookingRow({ b, date, barberName, barbers }: { b: Booking; date: string; barberName: string; barbers: { id: string; name: string }[] }) {
  const total = b.services.reduce((s, x) => s + x.price_cents, 0);
  const statusLabel = { confirmed: "", cancelled: "Storniert", no_show: "No-Show" }[b.status];
  return (
    <li id={`b-${b.id}`} className={`scroll-mt-4 border-b border-line py-4 ${b.status === "cancelled" ? "opacity-50" : ""}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p>
          <span className="font-medium tabular-nums">{berlinTime(b.starts_at)}</span> · {b.customer_name}
          <span className="text-mute"> · {barberName}</span>
          {statusLabel && <span className="label ml-2 text-ink">{statusLabel}</span>}
          {b.source !== "online" && <span className="label ml-2">{b.source === "walk_in" ? "Walk-in" : "Telefon"}</span>}
        </p>
        <p className="text-sm tabular-nums">{euro(total)}</p>
      </div>
      <p className="mt-1 text-sm text-mute">
        {b.services.map((s) => s.name).join(", ")}
        {b.is_returning ? " · Stammkunde" : " · Neu"}
      </p>
      <p className="mt-1 text-sm">
        {b.phone && (
          <a href={`tel:${b.phone.replace(/\s/g, "")}`} className="underline underline-offset-2">
            {b.phone}
          </a>
        )}
        {b.email && <span className="text-mute"> · {b.email}</span>}
      </p>
      {b.note && <p className="mt-1 text-sm italic">„{b.note}“</p>}

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {b.status === "confirmed" ? (
          <>
            <form action={setStatus.bind(null, b.id, "cancelled", date)}>
              <button className="btn border border-line px-3 py-2">Stornieren</button>
            </form>
            <form action={setStatus.bind(null, b.id, "no_show", date)}>
              <button className="btn border border-line px-3 py-2">No-Show</button>
            </form>
            <details className="w-full sm:w-auto">
              <summary className="btn cursor-pointer border border-line px-3 py-2">Verschieben</summary>
              <form action={moveBooking.bind(null, b.id)} className="mt-2 flex flex-wrap items-end gap-2">
                <Input name="date" label="Datum" type="date" defaultValue={berlinDate(b.starts_at)} required />
                <Input name="time" label="Uhrzeit" type="time" step={300} defaultValue={berlinTime(b.starts_at)} required />
                <Select name="barber_id" label="Barber" options={barbers.map((x) => [x.id, x.name])} defaultValue={b.barber_id} />
                <button className="btn btn-dark px-3 py-2">Speichern</button>
              </form>
            </details>
          </>
        ) : (
          <form action={setStatus.bind(null, b.id, "confirmed", date)}>
            <button className="btn border border-line px-3 py-2">Wiederherstellen</button>
          </form>
        )}
      </div>
    </li>
  );
}

function Input({ label, className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label block">{label}</span>
      <input {...props} className="field" />
    </label>
  );
}

function Select({
  label,
  name,
  options,
  className = "",
  defaultValue,
}: {
  label: string;
  name: string;
  options: [string, string][];
  className?: string;
  defaultValue?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label block">{label}</span>
      <select name={name} defaultValue={defaultValue} className="field">
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function Login({ sent, msg }: { sent: boolean; msg?: string }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col px-5 py-20">
      <p className="label">Team-Login</p>
      <h1 className="headline mt-2 text-5xl">Admin</h1>
      {!isAuthConfigured ? (
        <p className="mt-6 text-sm">Supabase ist nicht konfiguriert. Siehe README → Setup.</p>
      ) : sent ? (
        <p className="mt-6 text-sm">Check dein Postfach – der Login-Link ist unterwegs.</p>
      ) : (
        <form action={sendMagicLink} className="mt-8 space-y-6">
          <label className="block">
            <span className="label block">E-Mail</span>
            <input type="email" name="email" required autoComplete="email" className="field" />
          </label>
          <button className="btn btn-dark w-full">Login-Link senden</button>
        </form>
      )}
      {msg && <p className="mt-4 text-sm" role="alert">{msg}</p>}
    </main>
  );
}
