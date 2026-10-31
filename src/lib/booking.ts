import "server-only";
import { randomBytes } from "node:crypto";
import { bookingConfig } from "@/config/salon";
import { repo } from "@/lib/db";
import { computeSlots, isDayOpen, pickLeastBusyBarber, type Slot } from "@/lib/slots";
import { berlinToUtc, nextDays, shiftDate } from "@/lib/time";
import type { Barber, Service } from "@/lib/types";

export const ANY = "any";

export type DayInfo = { date: string; open: boolean };

export function newCancelToken() {
  return randomBytes(24).toString("base64url");
}

function dayBounds(date: string) {
  return { from: berlinToUtc(date, "00:00").toISOString(), to: berlinToUtc(shiftDate(date, 1), "00:00").toISOString() };
}

/** Prüft die Auswahl: genau eine Hauptleistung + beliebige Extras. */
export function resolveServices(all: Service[], slugs: string[]): Service[] | null {
  const chosen = [...new Set(slugs)].map((s) => all.find((x) => x.slug === s));
  if (chosen.some((s) => !s)) return null;
  const list = chosen as Service[];
  if (list.filter((s) => !s.is_extra).length !== 1) return null;
  return list.sort((a, b) => Number(a.is_extra) - Number(b.is_extra) || a.sort - b.sort);
}

export async function getOpenDays(now = new Date()): Promise<DayInfo[]> {
  const [barbers, workingHours] = await Promise.all([repo.listBarbers(), repo.listWorkingHours()]);
  const days = nextDays(bookingConfig.horizonDays, now);
  const timeOff = await repo.listTimeOff(
    berlinToUtc(days[0], "00:00").toISOString(),
    berlinToUtc(shiftDate(days.at(-1)!, 1), "00:00").toISOString(),
  );
  const barberIds = barbers.map((b) => b.id);
  return days.map((date) => ({ date, open: isDayOpen({ date, workingHours, timeOff, barberIds }) }));
}

export async function getSlots(params: {
  barber: string;
  serviceSlugs: string[];
  date: string;
  now?: Date;
  barbers?: Barber[];
}): Promise<Slot[]> {
  const now = params.now ?? new Date();
  const days = nextDays(bookingConfig.horizonDays, now);
  if (!days.includes(params.date)) return [];

  const [barbers, services, workingHours] = await Promise.all([
    params.barbers ?? repo.listBarbers(),
    repo.listServices(),
    repo.listWorkingHours(),
  ]);
  const chosen = resolveServices(services, params.serviceSlugs);
  if (!chosen) return [];
  const barberIds =
    params.barber === ANY ? barbers.map((b) => b.id) : barbers.filter((b) => b.slug === params.barber).map((b) => b.id);
  if (!barberIds.length) return [];

  const { from, to } = dayBounds(params.date);
  const [bookings, timeOff] = await Promise.all([
    repo.listBookings(from, to, { statuses: ["confirmed", "no_show"] }),
    repo.listTimeOff(from, to),
  ]);

  return computeSlots({
    date: params.date,
    barberIds,
    workingHours,
    bookings,
    timeOff,
    durationMin: chosen.reduce((s, x) => s + x.duration_min, 0),
    now,
    stepMin: bookingConfig.stepMin,
    bufferMin: bookingConfig.bufferMin,
    leadMin: bookingConfig.leadMin,
  });
}

/** Wählt für einen freien Slot den Barber (bei „Schnellstmöglich“ den am wenigsten ausgelasteten). */
export async function assignBarber(slot: Slot, date: string): Promise<string> {
  if (slot.barberIds.length === 1) return slot.barberIds[0];
  const { from, to } = dayBounds(date);
  const dayBookings = await repo.listBookings(from, to, { statuses: ["confirmed"] });
  return pickLeastBusyBarber(slot.barberIds, dayBookings);
}

// --- Simples Rate-Limit pro IP (pro Server-Instanz, im Speicher) ---
const hits = new Map<string, number[]>();
export function rateLimited(ip: string): boolean {
  const hourAgo = Date.now() - 3_600_000;
  const recent = (hits.get(ip) ?? []).filter((t) => t > hourAgo);
  if (recent.length >= bookingConfig.rateLimitPerHour) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(Date.now());
  hits.set(ip, recent);
  return false;
}

/** Online-Storno ist bis `cancelUntilHoursBefore` Stunden vor Terminbeginn möglich. */
export function cancelDeadlinePassed(startsAt: string, now = Date.now()): boolean {
  return now > Date.parse(startsAt) - bookingConfig.cancelUntilHoursBefore * 3_600_000;
}
