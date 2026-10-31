import "server-only";
import { Resend } from "resend";
import { bookingConfig, salon, siteUrl } from "@/config/salon";
import { bookingIcs } from "@/lib/ics";
import { euro, formatBerlin } from "@/lib/time";
import type { Booking } from "@/lib/types";

type Mail = { to: string; subject: string; text: string; attachments?: { filename: string; content: string }[] };

/** Ohne RESEND_API_KEY werden Mails nur in die Konsole geloggt. */
async function send(mail: Mail) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`\n[mail] an ${mail.to} – ${mail.subject}\n${mail.text}\n`);
    return;
  }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: process.env.MAIL_FROM || `${salon.name} <termine@salonmajesto.de>`,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    attachments: mail.attachments?.map((a) => ({ filename: a.filename, content: Buffer.from(a.content).toString("base64") })),
  });
  if (error) console.error("[mail] Fehler:", error);
}

function summary(b: Booking, barberName: string) {
  const total = b.services.reduce((s, x) => s + x.price_cents, 0);
  return [
    `Barber:   ${barberName}`,
    `Leistung: ${b.services.map((s) => s.name).join(", ")}`,
    `Termin:   ${formatBerlin(b.starts_at, "EEEE, d. MMMM yyyy 'um' HH:mm 'Uhr'")}`,
    `Preis:    ${euro(total)} – Bezahlung vor Ort`,
  ].join("\n");
}

const footer = () =>
  [
    "",
    `${salon.name}`,
    `${salon.address.street}, ${salon.address.zip} ${salon.address.city}`,
    `${salon.phone}`,
  ].join("\n");

const firstName = (name: string) => name.trim().split(/\s+/)[0];

export async function sendBookingConfirmation(b: Booking, barberName: string) {
  if (!b.email) return;
  await send({
    to: b.email,
    subject: `Dein Termin am ${formatBerlin(b.starts_at, "d.M. 'um' HH:mm")} – ${salon.name}`,
    text: [
      `Hi ${firstName(b.customer_name)},`,
      "",
      "dein Termin steht.",
      "",
      summary(b, barberName),
      "",
      `Du kannst nicht? Bis ${bookingConfig.cancelUntilHoursBefore} Stunden vorher hier stornieren:`,
      `${siteUrl()}/termin/storno/${b.cancel_token}`,
      "",
      "Bis bald.",
      footer(),
    ].join("\n"),
    attachments: [{ filename: "termin.ics", content: bookingIcs(b, barberName, bookingConfig.bufferMin) }],
  });
}

export async function sendReminder(b: Booking, barberName: string) {
  if (!b.email) return;
  await send({
    to: b.email,
    subject: `Morgen um ${formatBerlin(b.starts_at, "HH:mm")} – ${salon.name}`,
    text: [
      `Hi ${firstName(b.customer_name)},`,
      "",
      "kurze Erinnerung an deinen Termin morgen.",
      "",
      summary(b, barberName),
      "",
      `Stornieren (bis ${bookingConfig.cancelUntilHoursBefore} h vorher): ${siteUrl()}/termin/storno/${b.cancel_token}`,
      footer(),
    ].join("\n"),
  });
}

export async function sendCancellation(b: Booking, barberName: string) {
  if (!b.email) return;
  await send({
    to: b.email,
    subject: `Termin storniert – ${salon.name}`,
    text: [
      `Hi ${firstName(b.customer_name)},`,
      "",
      "dein Termin wurde storniert:",
      "",
      summary(b, barberName),
      "",
      `Neuen Termin buchen: ${siteUrl()}/termin`,
      footer(),
    ].join("\n"),
  });
}

export async function notifySalon(b: Booking, barberName: string) {
  const to = process.env.SALON_NOTIFY_EMAIL;
  if (!to) return;
  await send({
    to,
    subject: `Neue Online-Buchung: ${b.customer_name}, ${formatBerlin(b.starts_at, "EEE d.M. HH:mm")} (${barberName})`,
    text: [
      summary(b, barberName),
      "",
      `Kunde:   ${b.customer_name}${b.is_returning ? " (war schon mal hier)" : " (neu)"}`,
      `Telefon: ${b.phone}`,
      `E-Mail:  ${b.email ?? "–"}`,
      b.note ? `Notiz:   ${b.note}` : "",
      "",
      `${siteUrl()}/admin?date=${formatBerlin(b.starts_at, "yyyy-MM-dd")}`,
    ].join("\n"),
  });
}
