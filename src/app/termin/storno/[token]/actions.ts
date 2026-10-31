"use server";

import { redirect } from "next/navigation";
import { cancelDeadlinePassed } from "@/lib/booking";
import { repo } from "@/lib/db";
import { sendCancellation } from "@/lib/mail";

export async function cancelByToken(token: string) {
  const booking = await repo.getBookingByToken(token);
  if (!booking || booking.status !== "confirmed") redirect(`/termin/storno/${token}`);
  if (cancelDeadlinePassed(booking.starts_at)) redirect(`/termin/storno/${token}?zu-spaet=1`);
  await repo.updateBooking(booking.id, { status: "cancelled" });
  const barber = (await repo.listBarbers({ includeInactive: true })).find((b) => b.id === booking.barber_id);
  await sendCancellation(booking, barber?.name ?? "");
  redirect(`/termin/storno/${token}?ok=1`);
}
