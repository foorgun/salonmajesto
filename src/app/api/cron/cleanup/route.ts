import { subMonths } from "date-fns";
import { authorizedCron } from "../auth";
import { bookingConfig } from "@/config/salon";
import { repo } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Täglich: Buchungsdaten nach 12 Monaten löschen (DSGVO, Datenminimierung). */
export async function GET(req: Request) {
  if (!authorizedCron(req)) return new Response("Unauthorized", { status: 401 });
  const deleted = await repo.deleteBookingsEndingBefore(subMonths(new Date(), bookingConfig.retentionMonths).toISOString());
  return Response.json({ deleted });
}
