import { salon, siteUrl } from "@/config/salon";
import type { Booking } from "@/lib/types";

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

export function bookingIcs(b: Booking, barberName: string, bufferMin: number): string {
  const end = new Date(Date.parse(b.ends_at) - bufferMin * 60_000).toISOString();
  const services = b.services.map((s) => s.name).join(", ");
  const location = `${salon.name}, ${salon.address.street}, ${salon.address.zip} ${salon.address.city}`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Salon Majesto//Termin//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${b.id}@salonmajesto`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(b.starts_at)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(`${salon.name} – ${services}`)}`,
    `DESCRIPTION:${esc(`Bei ${barberName}. Stornieren: ${siteUrl()}/termin/storno/${b.cancel_token}`)}`,
    `LOCATION:${esc(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
