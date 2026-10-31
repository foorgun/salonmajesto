"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { ANY, assignBarber, getSlots, newCancelToken, rateLimited, resolveServices } from "@/lib/booking";
import { bookingConfig } from "@/config/salon";
import { isBookingDemo, repo } from "@/lib/db";
import { notifySalon, sendBookingConfirmation } from "@/lib/mail";
import { isValidDate } from "@/lib/time";
import { SlotTakenError } from "@/lib/types";

export type SlotView = { time: string; startsAt: string };

export async function loadSlots(barber: string, services: string[], date: string): Promise<SlotView[]> {
  if (!isValidDate(date)) return [];
  const slots = await getSlots({ barber, serviceSlugs: services, date });
  return slots.map(({ time, startsAt }) => ({ time, startsAt }));
}

const schema = z.object({
  barber: z.string().min(1),
  services: z.array(z.string()).min(1).max(10),
  date: z.string().refine(isValidDate),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim().min(2, "Bitte gib deinen Namen an.").max(80),
  phone: z
    .string()
    .trim()
    .min(6, "Bitte gib eine gültige Telefonnummer an.")
    .max(30)
    .regex(/^[+0-9 ()/-]+$/, "Bitte gib eine gültige Telefonnummer an."),
  email: z.email("Bitte gib eine gültige E-Mail-Adresse an.").max(120),
  isReturning: z.boolean(),
  note: z.string().trim().max(500).optional(),
  privacy: z.literal(true, { error: "Bitte bestätige die Datenschutzerklärung." }),
  website: z.string().max(0).optional(), // Honeypot
});

export type BookInput = z.input<typeof schema>;
export type BookResult =
  | { ok: true; url: string }
  | { ok: false; error: string; field?: string; slotTaken?: boolean; slots?: SlotView[] };

export async function book(input: BookInput): Promise<BookResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue.path[0] === "website") return { ok: false, error: "Buchung nicht möglich." };
    return { ok: false, error: issue.message, field: String(issue.path[0] ?? "") };
  }
  const d = parsed.data;

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  if (rateLimited(ip)) {
    return { ok: false, error: "Zu viele Buchungen in kurzer Zeit. Bitte ruf uns kurz an." };
  }

  const [barbers, services] = await Promise.all([repo.listBarbers(), repo.listServices()]);
  const chosen = resolveServices(services, d.services);
  if (!chosen) return { ok: false, error: "Bitte wähle eine Leistung." };

  const slots = await getSlots({ barber: d.barber, serviceSlugs: d.services, date: d.date, barbers });
  const slot = slots.find((s) => s.time === d.time);
  const freshSlots = () => slots.map(({ time, startsAt }) => ({ time, startsAt }));
  if (!slot) {
    return { ok: false, slotTaken: true, error: "Dieser Slot wurde gerade vergeben.", slots: freshSlots() };
  }

  const barberId = d.barber === ANY ? await assignBarber(slot, d.date) : slot.barberIds[0];
  const durationMin = chosen.reduce((s, x) => s + x.duration_min, 0);
  const startsAt = new Date(slot.startsAt);
  const endsAt = new Date(startsAt.getTime() + (durationMin + bookingConfig.bufferMin) * 60_000);

  // Demo: alles geprüft wie echt, aber nichts speichern und keine Mails – nur die Bestätigungsseite zeigen.
  if (isBookingDemo) {
    const params = new URLSearchParams({
      n: d.name,
      b: barbers.find((b) => b.id === barberId)?.name ?? "",
      s: chosen.map((x) => x.name).join("|"),
      t: startsAt.toISOString(),
      p: String(chosen.reduce((sum, x) => sum + x.price_cents, 0)),
    });
    return { ok: true, url: `/termin/bestaetigt/demo?${params}` };
  }

  try {
    const booking = await repo.createBooking({
      barber_id: barberId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      customer_name: d.name,
      phone: d.phone,
      email: d.email,
      is_returning: d.isReturning,
      note: d.note || null,
      cancel_token: newCancelToken(),
      source: "online",
      services: chosen.map((s) => ({
        service_id: s.id,
        name: s.name,
        price_cents: s.price_cents,
        duration_min: s.duration_min,
      })),
    });
    const barberName = barbers.find((b) => b.id === barberId)?.name ?? "";
    await Promise.allSettled([sendBookingConfirmation(booking, barberName), notifySalon(booking, barberName)]);
    return { ok: true, url: `/termin/bestaetigt/${booking.id}` };
  } catch (e) {
    if (e instanceof SlotTakenError) {
      const again = await loadSlots(d.barber, d.services, d.date);
      return { ok: false, slotTaken: true, error: e.message, slots: again };
    }
    console.error(e);
    return { ok: false, error: "Da ist etwas schiefgelaufen. Bitte versuch es nochmal oder ruf uns an." };
  }
}
