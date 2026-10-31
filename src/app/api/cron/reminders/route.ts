import { authorizedCron } from "../auth";
import { repo } from "@/lib/db";
import { sendReminder } from "@/lib/mail";

export const dynamic = "force-dynamic";

/**
 * Täglich ~17/18 Uhr (Vercel Hobby erlaubt nur tägliche Crons): Erinnerung an alle bestätigten
 * Termine, die in 12–36 h beginnen – also am Folgetag. Aufeinanderfolgende Läufe decken lückenlos
 * ab; `reminder_sent_at` verhindert doppelte Mails (auch bei häufigeren Läufen).
 */
export async function GET(req: Request) {
  if (!authorizedCron(req)) return new Response("Unauthorized", { status: 401 });
  const now = Date.now();
  const from = new Date(now + 12 * 3_600_000).toISOString();
  const to = new Date(now + 36 * 3_600_000).toISOString();
  const [bookings, barbers] = await Promise.all([
    repo.listBookings(from, to, { statuses: ["confirmed"] }),
    repo.listBarbers({ includeInactive: true }),
  ]);
  let sent = 0;
  for (const b of bookings) {
    if (b.reminder_sent_at || !b.email || Date.parse(b.starts_at) < Date.parse(from) || Date.parse(b.starts_at) > Date.parse(to)) continue;
    await sendReminder(b, barbers.find((x) => x.id === b.barber_id)?.name ?? "");
    await repo.updateBooking(b.id, { reminder_sent_at: new Date().toISOString() });
    sent++;
  }
  return Response.json({ sent });
}
