import { updateService, updateWorkingHours } from "../actions";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/db";
import { WEEKDAYS_LONG } from "@/lib/hours";

export const dynamic = "force-dynamic";

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [services, barbers, workingHours] = await Promise.all([
    repo.listServices({ includeInactive: true }),
    repo.listBarbers(),
    repo.listWorkingHours(),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {sp.msg && (
        <p role="status" className="mb-6 border-l-2 border-ink bg-white/60 px-3 py-2 text-sm">
          {sp.msg}
        </p>
      )}
      <h1 className="headline text-5xl">Einstellungen</h1>

      <section className="mt-10" aria-labelledby="services-title">
        <h2 id="services-title" className="label">
          Leistungen & Preise
        </h2>
        <ul className="mt-3 border-t border-line">
          {services.map((s) => (
            <li key={s.id} className="border-b border-line py-3">
              <form action={updateService.bind(null, s.id)} className="grid grid-cols-[1fr_5rem_5rem] items-end gap-3 text-sm sm:grid-cols-[1fr_6rem_6rem_auto_auto]">
                <label className="col-span-3 sm:col-span-1">
                  <span className="label block">{s.is_extra ? "Extra" : "Leistung"}</span>
                  <input name="name" defaultValue={s.name} className="field" required />
                </label>
                <label>
                  <span className="label block">Preis €</span>
                  <input name="price" inputMode="decimal" defaultValue={(s.price_cents / 100).toString().replace(".", ",")} className="field tabular-nums" required />
                </label>
                <label>
                  <span className="label block">Min</span>
                  <input name="duration" type="number" min={5} step={5} defaultValue={s.duration_min} className="field tabular-nums" required />
                </label>
                <label className="flex items-center gap-2 pb-2">
                  <input type="checkbox" name="active" defaultChecked={s.active} className="accent-ink" /> aktiv
                </label>
                <button className="btn border border-line px-3 py-2">Speichern</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14" aria-labelledby="hours-title">
        <h2 id="hours-title" className="label">
          Arbeitszeiten
        </h2>
        <p className="mt-2 text-sm text-mute">Format: 09:00-19:00 · Pause: 09:00-13:00, 14:00-19:00 · leer = frei</p>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {barbers.map((b) => (
            <form key={b.id} action={updateWorkingHours.bind(null, b.id)} className="border border-line p-4">
              <h3 className="font-label text-xl font-semibold uppercase tracking-wide">{b.name}</h3>
              <div className="mt-3 space-y-2 text-sm">
                {WEEK_ORDER.map((wd) => {
                  const value = workingHours
                    .filter((w) => w.barber_id === b.id && w.weekday === wd)
                    .sort((x, y) => x.start_time.localeCompare(y.start_time))
                    .map((w) => `${w.start_time}-${w.end_time}`)
                    .join(", ");
                  return (
                    <label key={wd} className="grid grid-cols-[6.5rem_1fr] items-center gap-2">
                      <span>{WEEKDAYS_LONG[wd]}</span>
                      <input name={`wd${wd}`} defaultValue={value} placeholder="frei" className="field py-1 tabular-nums" />
                    </label>
                  );
                })}
              </div>
              <button className="btn btn-dark mt-4 w-full">Speichern</button>
            </form>
          ))}
        </div>
      </section>
    </main>
  );
}
