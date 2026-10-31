import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { phoneIntl, salon } from "@/config/salon";
import { repo } from "@/lib/db";
import { euro, formatBerlin } from "@/lib/time";

export const metadata: Metadata = { title: "Termin bestätigt", robots: { index: false } };

export default async function ConfirmedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const booking = await repo.getBooking(id);
  if (!booking) notFound();
  const barbers = await repo.listBarbers({ includeInactive: true });
  const barber = barbers.find((b) => b.id === booking.barber_id);
  const total = booking.services.reduce((s, x) => s + x.price_cents, 0);
  const firstName = booking.customer_name.trim().split(/\s+/)[0];
  const cancelled = booking.status === "cancelled";

  const rows: [string, string][] = [
    ["Barber", barber?.name ?? "–"],
    ["Leistung", booking.services.map((s) => s.name).join(", ")],
    ["Termin", formatBerlin(booking.starts_at, "EEE d.M. · HH:mm")],
    ["Preis", `${euro(total)} vor Ort`],
  ];

  return (
    <main className="starfield flex min-h-dvh flex-col items-center justify-center bg-night px-5 py-16 text-paper">
      <div className="w-full max-w-sm text-center">
        <Link href="/" aria-label="Zur Startseite" className="inline-block">
          <Logo className="mx-auto h-14 w-auto" />
        </Link>
        <h1 className="headline mt-10 text-6xl">
          {cancelled ? "Storniert." : <>Bis bald,<br />{firstName}.</>}
        </h1>
        <p className="mt-4 text-sm text-paper/70">
          {cancelled ? "Dieser Termin wurde storniert." : booking.email ? "Bestätigung ist per E-Mail unterwegs." : "Dein Termin ist gebucht."}
        </p>

        <dl className="mt-10 border-t border-paper/15 text-left text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-6 border-b border-paper/15 py-3">
              <dt className="text-paper/60">{k}</dt>
              <dd className="text-right font-medium tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>

        {!cancelled && (
          <div className="mt-10 flex flex-col gap-3">
            <a href={`/api/ics/${booking.id}`} className="btn btn-light w-full">
              Zum Kalender hinzufügen
            </a>
            <Link href={`/termin/storno/${booking.cancel_token}`} className="btn btn-ghost-light w-full">
              Termin stornieren
            </Link>
          </div>
        )}
        <p className="mt-10 text-xs text-paper/50">
          {salon.address.street}, {salon.address.zip} {salon.address.city} ·{" "}
          <a href={`tel:${phoneIntl()}`} className="underline underline-offset-2">
            {salon.phone}
          </a>
        </p>
      </div>
    </main>
  );
}
