"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { book, loadSlots, type SlotView } from "./actions";

export type FlowBarber = { slug: string; name: string; photo: string | null };
export type FlowService = { slug: string; name: string; priceCents: number; durationMin: number; isExtra: boolean };
type Day = { date: string; open: boolean };

type Initial = {
  barber: string | null;
  service: string | null;
  extras: string[];
  date: string | null;
  time: string | null;
  step: number | null;
};

const ANY = "any";
const WD = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MONTHS = ["Jan", "Feb", "März", "Apr", "Mai", "Juni", "Juli", "Aug", "Sep", "Okt", "Nov", "Dez"];

const euro = (cents: number) => `${Number.isInteger(cents / 100) ? cents / 100 : (cents / 100).toFixed(2).replace(".", ",")} €`;
const parts = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d, wd: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
};
const shortDate = (date: string) => {
  const p = parts(date);
  return `${WD[p.wd]} ${p.d}.${p.m}.`;
};

export function BookingFlow({
  barbers,
  services,
  days,
  initial,
}: {
  barbers: FlowBarber[];
  services: FlowService[];
  days: Day[];
  initial: Initial;
}) {
  const router = useRouter();
  const firstOpen = days.find((d) => d.open)?.date ?? days[0].date;

  const [barber, setBarber] = useState<string | null>(initial.barber);
  const [service, setService] = useState<string | null>(initial.service);
  const [extras, setExtras] = useState<string[]>(initial.extras);
  const [date, setDate] = useState<string>(initial.date ?? firstOpen);
  const [time, setTime] = useState<string | null>(initial.time);
  const [step, setStep] = useState<number>(() => {
    const max = !initial.barber ? 1 : !initial.service ? 2 : !initial.time || !initial.date ? 3 : 4;
    return Math.min(initial.step ?? max, max);
  });

  const [slots, setSlots] = useState<SlotView[] | null>(null);
  const [slotsFor, setSlotsFor] = useState<string>("");
  const [loadingSlots, startSlots] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);

  const [form, setForm] = useState({ name: "", phone: "", email: "", note: "", isReturning: false, privacy: false, website: "" });

  const headingRef = useRef<HTMLHeadingElement>(null);

  const mainServices = services.filter((s) => !s.isExtra);
  const extraServices = services.filter((s) => s.isExtra);
  const chosen = useMemo(
    () => services.filter((s) => s.slug === service || extras.includes(s.slug)),
    [services, service, extras],
  );
  const total = chosen.reduce((s, x) => s + x.priceCents, 0);
  const duration = chosen.reduce((s, x) => s + x.durationMin, 0);
  const serviceSlugs = useMemo(() => (service ? [service, ...extras] : []), [service, extras]);
  const slotKey = `${barber}|${serviceSlugs.join(",")}|${date}`;
  const barberName = barber === ANY ? "Schnellstmöglich" : barbers.find((b) => b.slug === barber)?.name;
  const mainName = services.find((s) => s.slug === service)?.name;

  // State in der URL halten (Reload-sicher, teilbar); fremde Parameter (z. B. utm_*) bleiben erhalten.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const set = (k: string, v: string | null | undefined) => (v ? params.set(k, v) : params.delete(k));
    set("barber", barber);
    set("service", service);
    set("extras", extras.join(","));
    set("date", step >= 3 ? date : null);
    set("time", time);
    set("step", String(step));
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, [barber, service, extras, date, time, step]);

  // Slots laden, sobald Schritt 3 mit neuer Auswahl erreicht wird
  useEffect(() => {
    if (step !== 3 || !barber || !service || slotsFor === slotKey) return;
    let cancelled = false;
    startSlots(async () => {
      const result = await loadSlots(barber, serviceSlugs, date);
      if (cancelled) return;
      setSlots(result);
      setSlotsFor(slotKey);
    });
    return () => {
      cancelled = true;
    };
  }, [step, barber, service, serviceSlugs, date, slotKey, slotsFor]);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [step]);

  const canNext =
    (step === 1 && !!barber) ||
    (step === 2 && !!service) ||
    (step === 3 && !!time && slotsFor === slotKey && !!slots?.some((s) => s.time === time)) ||
    step === 4;

  function go(n: number) {
    setError(null);
    setStep(n);
  }

  function selectDate(d: string) {
    setDate(d);
    setTime(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!barber || !service || !time) return;
    setError(null);
    startSubmit(async () => {
      const res = await book({
        barber,
        services: serviceSlugs,
        date,
        time,
        name: form.name,
        phone: form.phone,
        email: form.email,
        isReturning: form.isReturning,
        note: form.note || undefined,
        privacy: form.privacy as true,
        website: form.website,
      });
      if (res.ok) {
        router.push(`/termin/bestaetigt/${res.id}`);
        return;
      }
      if (res.slotTaken) {
        setSlots(res.slots ?? []);
        setSlotsFor(slotKey);
        setTime(null);
        setStep(3);
        setError({ message: `${res.error} Wähl bitte eine andere Zeit.` });
        return;
      }
      setError({ message: res.error, field: res.field });
    });
  }

  const titles = [
    { h: "Bei wem?", sub: "Wähle deinen Barber." },
    { h: "Leistung", sub: "Was dürfen wir machen?" },
    { h: "Wann?", sub: barber === ANY ? "Erster freier Termin bei allen Barbern" : `Freie Zeiten bei ${barberName}` },
    { h: "Deine Daten", sub: "Für Bestätigung & Erinnerung." },
  ];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col bg-paper">
      {/* Kopf */}
      <div className="sticky top-0 z-10 bg-paper">
        <div className="flex h-14 items-center justify-between px-5">
          {step > 1 ? (
            <button type="button" onClick={() => go(step - 1)} className="-ml-2 p-2 text-sm">
              ← Zurück
            </button>
          ) : (
            <Link href="/" aria-label="Salon Majesto – Startseite" className="-ml-2 p-2 font-label text-sm font-semibold uppercase tracking-wider">
              Majesto
            </Link>
          )}
          <Link href="/" aria-label="Buchung abbrechen" className="-mr-2 p-2 text-xl leading-none">
            ×
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-1.5 px-5" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step} aria-label={`Schritt ${step} von 4`}>
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className={`h-[3px] ${n <= step ? "bg-ink" : "bg-line"}`} />
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-1 flex-col" noValidate>
        <div className="flex-1 px-5 pb-36 pt-8">
          <p className="label">Schritt {step} von 4</p>
          <h1 ref={headingRef} tabIndex={-1} className="headline mt-2 text-5xl outline-none">
            {titles[step - 1].h}
          </h1>
          <p className="mt-2 text-sm text-mute">{titles[step - 1].sub}</p>

          {error && step !== 4 && (
            <p role="alert" className="mt-6 border-l-2 border-ink pl-3 text-sm">
              {error.message}
            </p>
          )}

          {/* 1 · Barber */}
          {step === 1 && (
            <fieldset className="mt-8 space-y-2">
              <legend className="sr-only">Barber wählen</legend>
              <Choice name="barber" value={ANY} checked={barber === ANY} onChange={() => setBarber(ANY)}>
                <span className="size-10 shrink-0 rounded-full bg-ink" aria-hidden />
                <span>
                  <span className="block">Schnellstmöglich</span>
                  <span className="block text-xs text-mute">Erster freier Termin</span>
                </span>
              </Choice>
              {barbers.map((b) => (
                <Choice key={b.slug} name="barber" value={b.slug} checked={barber === b.slug} onChange={() => setBarber(b.slug)}>
                  <Avatar barber={b} />
                  <span>{b.name}</span>
                </Choice>
              ))}
            </fieldset>
          )}

          {/* 2 · Leistung */}
          {step === 2 && (
            <div className="mt-8">
              <fieldset className="space-y-2">
                <legend className="sr-only">Hauptleistung</legend>
                {mainServices.map((s) => (
                  <Choice key={s.slug} name="service" value={s.slug} checked={service === s.slug} onChange={() => setService(s.slug)}>
                    <span className="flex-1">
                      <span className="block">{s.name}</span>
                      <span className="block text-xs text-mute">ca. {s.durationMin} Min</span>
                    </span>
                    <span className="tabular-nums">{euro(s.priceCents)}</span>
                  </Choice>
                ))}
              </fieldset>
              <fieldset className="mt-8 space-y-2">
                <legend className="label mb-3">Extras</legend>
                {extraServices.map((s) => (
                  <Choice
                    key={s.slug}
                    type="checkbox"
                    name="extras"
                    value={s.slug}
                    checked={extras.includes(s.slug)}
                    onChange={() => setExtras((x) => (x.includes(s.slug) ? x.filter((e) => e !== s.slug) : [...x, s.slug]))}
                  >
                    <span className="flex-1">{s.name}</span>
                    <span className="tabular-nums">+{euro(s.priceCents)}</span>
                  </Choice>
                ))}
              </fieldset>
            </div>
          )}

          {/* 3 · Wann */}
          {step === 3 && (
            <div className="mt-8">
              <fieldset>
                <legend className="sr-only">Tag wählen</legend>
                <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1">
                  {days.map((d) => {
                    const p = parts(d.date);
                    const active = d.date === date;
                    return (
                      <label
                        key={d.date}
                        className={`flex w-12 shrink-0 cursor-pointer flex-col items-center border py-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
                          active ? "border-ink bg-ink text-paper" : "border-line"
                        } ${d.open ? "" : "cursor-not-allowed opacity-35"}`}
                      >
                        <input
                          type="radio"
                          name="date"
                          value={d.date}
                          checked={active}
                          disabled={!d.open}
                          onChange={() => selectDate(d.date)}
                          className="sr-only"
                        />
                        <span className={`text-[10px] ${active ? "text-paper/70" : "text-mute"}`}>{WD[p.wd]}</span>
                        <span className="text-base tabular-nums">{p.d}</span>
                        <span className="sr-only">{`${p.d}. ${MONTHS[p.m - 1]}${d.open ? "" : ", geschlossen"}`}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <p className="mt-6 text-sm text-mute">
                {(() => {
                  const p = parts(date);
                  return `${["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"][p.wd]}, ${p.d}. ${MONTHS[p.m - 1]}`;
                })()}
              </p>
              <fieldset className="mt-3" aria-busy={loadingSlots}>
                <legend className="sr-only">Uhrzeit wählen</legend>
                {loadingSlots || slotsFor !== slotKey ? (
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4" aria-label="Lade freie Zeiten">
                    {Array.from({ length: 9 }, (_, i) => (
                      <span key={i} className="h-11 animate-pulse border border-line motion-reduce:animate-none" />
                    ))}
                  </div>
                ) : slots && slots.length ? (
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                    {slots.map((s) => {
                      const active = s.time === time;
                      return (
                        <label
                          key={s.time}
                          className={`flex h-11 cursor-pointer items-center justify-center border text-sm tabular-nums has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
                            active ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"
                          }`}
                        >
                          <input type="radio" name="time" value={s.time} checked={active} onChange={() => setTime(s.time)} className="sr-only" />
                          {s.time}
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="border-t border-line pt-4 text-sm">
                    An diesem Tag ist nichts mehr frei.{" "}
                    {barber !== ANY && (
                      <button type="button" className="underline underline-offset-4" onClick={() => setBarber(ANY)}>
                        Bei allen Barbern suchen
                      </button>
                    )}
                  </p>
                )}
              </fieldset>
            </div>
          )}

          {/* 4 · Daten */}
          {step === 4 && (
            <div className="mt-8 space-y-6">
              <Field label="Name" id="name" error={error?.field === "name" ? error.message : undefined}>
                <input id="name" name="name" autoComplete="name" required className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Telefon" id="phone" error={error?.field === "phone" ? error.message : undefined}>
                <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="E-Mail" id="email" error={error?.field === "email" ? error.message : undefined}>
                <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Notiz (optional)" id="note">
                <textarea id="note" name="note" rows={2} maxLength={500} className="field resize-none" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </Field>
              {/* Honeypot – für Menschen unsichtbar */}
              <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label htmlFor="website">Website</label>
                <input id="website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </div>
              <div className="space-y-3 pt-2 text-sm">
                <Check checked={form.isReturning} onChange={(v) => setForm({ ...form, isReturning: v })}>
                  Ich war schon mal hier
                </Check>
                <Check checked={form.privacy} onChange={(v) => setForm({ ...form, privacy: v })}>
                  Ich akzeptiere die{" "}
                  <Link href="/datenschutz" target="_blank" className="underline underline-offset-2">
                    Datenschutzerklärung
                  </Link>
                </Check>
                {error?.field === "privacy" && <p className="text-sm" role="alert">{error.message}</p>}
              </div>
              {error && !["name", "phone", "email", "privacy"].includes(error.field ?? "") && (
                <p role="alert" className="border-l-2 border-ink pl-3 text-sm">
                  {error.message}
                </p>
              )}
              <p className="text-xs text-mute">Bezahlung vor Ort. Kostenlos stornierbar bis 2 Stunden vorher.</p>
            </div>
          )}
        </div>

        {/* Fußleiste */}
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <p className="min-w-0 truncate text-sm" aria-live="polite">
              {step === 1 && barberName}
              {step === 2 && service && (
                <>
                  {mainName}
                  {extras.length ? ` +${extras.length}` : ""} · <strong className="font-medium tabular-nums">{euro(total)}</strong>
                  <span className="text-mute"> · {duration} Min</span>
                </>
              )}
              {step === 3 && (
                <>
                  {shortDate(date)}
                  {time && <strong className="font-medium tabular-nums"> · {time}</strong>}
                </>
              )}
              {step === 4 && (
                <>
                  {shortDate(date)} {time} · <strong className="font-medium tabular-nums">{euro(total)}</strong>
                </>
              )}
            </p>
            {step < 4 ? (
              <button key="next" type="button" className="btn btn-dark shrink-0 px-5" disabled={!canNext} onClick={() => go(step + 1)}>
                Weiter
              </button>
            ) : (
              <button key="submit" type="submit" className="btn btn-dark shrink-0 px-5" disabled={submitting}>
                {submitting ? "Wird gebucht …" : "Verbindlich buchen"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

function Choice({
  type = "radio",
  name,
  value,
  checked,
  onChange,
  children,
}: {
  type?: "radio" | "checkbox";
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex min-h-14 cursor-pointer items-center gap-3 border bg-paper px-3.5 py-2.5 text-[15px] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
        checked ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-line hover:border-mute"
      }`}
    >
      <input type={type} name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}

function Avatar({ barber }: { barber: FlowBarber }) {
  return barber.photo ? (
    // eslint-disable-next-line @next/next/no-img-element -- kleine Avatare, bereits optimiert in /public
    <img src={barber.photo} alt="" width={40} height={40} className="size-10 shrink-0 rounded-full object-cover grayscale" />
  ) : (
    <span className="starfield flex size-10 shrink-0 items-center justify-center rounded-full font-label text-sm font-semibold text-paper" aria-hidden>
      {barber.name[0]}
    </span>
  );
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label block">
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-ink" />
      <span>{children}</span>
    </label>
  );
}
