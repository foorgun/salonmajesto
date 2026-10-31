import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { BookingFlow, type FlowBarber, type FlowService } from "./BookingFlow";
import { ANY, getOpenDays } from "@/lib/booking";
import Link from "next/link";
import { phoneIntl, salon, whatsappUrl } from "@/config/salon";
import { bookingAvailable, repo } from "@/lib/db";

export const metadata: Metadata = {
  title: "Termin buchen",
  description: "Termin bei Salon Majesto online buchen – in 4 Schritten, Bezahlung vor Ort.",
  alternates: { canonical: "/termin" },
};

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function TerminPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  if (!bookingAvailable) return <BookingUnavailable />;
  const [barbers, services, days] = await Promise.all([repo.listBarbers(), repo.listServices(), getOpenDays()]);

  const flowBarbers: FlowBarber[] = barbers.map((b) => {
    const src = b.photo_url ?? `/images/team-${b.slug}.jpg`;
    return {
      slug: b.slug,
      name: b.name,
      photo: fs.existsSync(path.join(process.cwd(), "public", src)) ? src : null,
    };
  });
  const flowServices: FlowService[] = services.map((s) => ({
    slug: s.slug,
    name: s.name,
    priceCents: s.price_cents,
    durationMin: s.duration_min,
    isExtra: s.is_extra,
  }));

  const barber = one(sp.barber);
  const service = one(sp.service);
  const initial = {
    barber: barber === ANY || flowBarbers.some((b) => b.slug === barber) ? barber! : null,
    service: flowServices.some((s) => s.slug === service && !s.isExtra) ? service! : null,
    extras: (one(sp.extras) ?? "").split(",").filter((e) => flowServices.some((s) => s.slug === e && s.isExtra)),
    date: days.some((d) => d.date === one(sp.date) && d.open) ? one(sp.date)! : null,
    time: /^\d{2}:\d{2}$/.test(one(sp.time) ?? "") ? one(sp.time)! : null,
    step: Number(one(sp.step)) || null,
  };

  return <BookingFlow barbers={flowBarbers} services={flowServices} days={days} initial={initial} />;
}

function BookingUnavailable() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-16">
      <p className="label">Termin buchen</p>
      <h1 className="headline mt-3 text-5xl">Gleich online.</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-mute">
        Die Online-Buchung startet in Kürze. Bis dahin kurz anrufen oder per WhatsApp schreiben – oder einfach vorbeikommen.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <a href={`tel:${phoneIntl()}`} className="btn btn-dark">
          Anrufen · {salon.phone}
        </a>
        <a href={whatsappUrl("Hi, ich hätte gern einen Termin.")} className="btn border border-ink" target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
        <Link href="/" className="mt-2 text-center text-sm underline underline-offset-4">
          Zur Startseite
        </Link>
      </div>
    </main>
  );
}
