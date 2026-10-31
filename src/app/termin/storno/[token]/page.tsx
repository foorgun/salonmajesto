import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelByToken } from "./actions";
import { bookingConfig, phoneIntl, salon } from "@/config/salon";
import { cancelDeadlinePassed } from "@/lib/booking";
import { repo } from "@/lib/db";
import { euro, formatBerlin } from "@/lib/time";

export const metadata: Metadata = { title: "Termin stornieren", robots: { index: false } };

export default async function CancelPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const booking = await repo.getBookingByToken(token);
  if (!booking) notFound();
  const barber = (await repo.listBarbers({ includeInactive: true })).find((b) => b.id === booking.barber_id);
  const tooLate = cancelDeadlinePassed(booking.starts_at);
  const total = booking.services.reduce((s, x) => s + x.price_cents, 0);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-16">
      <p className="label">Termin stornieren</p>
      <h1 className="headline mt-3 text-5xl">
        {booking.status === "cancelled" ? "Storniert." : tooLate ? "Zu kurzfristig." : "Wirklich absagen?"}
      </h1>

      <dl className="mt-8 border-t border-line text-sm">
        {[
          ["Barber", barber?.name ?? "–"],
          ["Leistung", booking.services.map((s) => s.name).join(", ")],
          ["Termin", formatBerlin(booking.starts_at, "EEEE, d. MMMM · HH:mm 'Uhr'")],
          ["Preis", euro(total)],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-6 border-b border-line py-3">
            <dt className="text-mute">{k}</dt>
            <dd className="text-right tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      {booking.status === "cancelled" ? (
        <>
          <p className="mt-6 text-sm">{sp.ok ? "Dein Termin wurde storniert. Danke, dass du Bescheid gibst." : "Dieser Termin ist bereits storniert."}</p>
          <Link href="/termin" className="btn btn-dark mt-8">
            Neuen Termin buchen
          </Link>
        </>
      ) : booking.status !== "confirmed" ? (
        <p className="mt-6 text-sm">Dieser Termin kann nicht mehr storniert werden.</p>
      ) : tooLate ? (
        <p className="mt-6 text-sm">
          Online-Storno ist bis {bookingConfig.cancelUntilHoursBefore} Stunden vorher möglich. Bitte ruf uns kurz an:{" "}
          <a className="underline underline-offset-4" href={`tel:${phoneIntl()}`}>
            {salon.phone}
          </a>
        </p>
      ) : (
        <form action={cancelByToken.bind(null, token)} className="mt-8 flex flex-col gap-3">
          <button type="submit" className="btn btn-dark">
            Termin stornieren
          </button>
          <Link href="/" className="btn border border-line">
            Doch nicht
          </Link>
        </form>
      )}
    </main>
  );
}
