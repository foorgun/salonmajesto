import { bookingConfig } from "@/config/salon";
import { repo } from "@/lib/db";
import { bookingIcs } from "@/lib/ics";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const booking = await repo.getBooking(id);
  if (!booking || booking.status === "cancelled") return new Response("Not found", { status: 404 });
  const barber = (await repo.listBarbers({ includeInactive: true })).find((b) => b.id === booking.barber_id);
  return new Response(bookingIcs(booking, barber?.name ?? "", bookingConfig.bufferMin), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="salon-majesto-termin.ics"',
      "Cache-Control": "no-store",
    },
  });
}
