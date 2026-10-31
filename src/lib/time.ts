import { addDays, format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { TIMEZONE } from "@/config/salon";

/** "YYYY-MM-DD" + "HH:MM" (Berliner Wandzeit) → UTC-Date */
export function berlinToUtc(date: string, time: string): Date {
  return fromZonedTime(`${date}T${time}:00`, TIMEZONE);
}

/** Kalenderdatum (YYYY-MM-DD) in Berlin für einen Zeitpunkt */
export function berlinDate(d: Date | string): string {
  return formatInTimeZone(typeof d === "string" ? parseISO(d) : d, TIMEZONE, "yyyy-MM-dd");
}

export function berlinTime(d: Date | string): string {
  return formatInTimeZone(typeof d === "string" ? parseISO(d) : d, TIMEZONE, "HH:mm");
}

export function formatBerlin(d: Date | string, pattern: string): string {
  return formatInTimeZone(typeof d === "string" ? parseISO(d) : d, TIMEZONE, pattern, { locale: de });
}

/** Wochentag (0 = So) eines Kalenderdatums, unabhängig von der Zeitzone des Servers */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Kalendertage ab heute (Berlin), inkl. heute */
export function nextDays(count: number, now = new Date()): string[] {
  const [y, m, d] = berlinDate(now).split("-").map(Number);
  const start = new Date(y, m - 1, d, 12);
  return Array.from({ length: count }, (_, i) => format(addDays(start, i), "yyyy-MM-dd"));
}

export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return format(addDays(new Date(y, m - 1, d, 12), days), "yyyy-MM-dd");
}

export function isValidDate(s: string | undefined | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

export function euro(cents: number): string {
  const v = cents / 100;
  return `${Number.isInteger(v) ? v : v.toFixed(2).replace(".", ",")} €`;
}
