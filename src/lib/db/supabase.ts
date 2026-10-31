import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Booking, BookingService } from "@/lib/types";
import { SlotTakenError } from "@/lib/types";
import type { Repo } from "./repo";

/** Service-Role-Client: nur serverseitig verwenden (Server Actions, Route Handler). */
let client: SupabaseClient | null = null;
function db() {
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

const EXCLUSION_VIOLATION = "23P01";

type BookingRow = Omit<Booking, "services"> & {
  booking_services: { service_id: string; price_cents: number; duration_min: number; services: { name: string } | null }[];
};

const BOOKING_SELECT = "*, booking_services(service_id, price_cents, duration_min, services(name))";

function mapBooking(row: BookingRow): Booking {
  const { booking_services, ...rest } = row;
  return {
    ...rest,
    services: (booking_services ?? []).map(
      (s): BookingService => ({
        service_id: s.service_id,
        name: s.services?.name ?? "",
        price_cents: s.price_cents,
        duration_min: s.duration_min,
      }),
    ),
  };
}

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) {
    if (res.error.code === EXCLUSION_VIOLATION) throw new SlotTakenError();
    throw new Error(res.error.message);
  }
  return res.data;
}

export const supabaseRepo: Repo = {
  async listBarbers(opts) {
    let q = db().from("barbers").select("*").order("sort");
    if (!opts?.includeInactive) q = q.eq("active", true);
    return check(await q) ?? [];
  },
  async listServices(opts) {
    let q = db().from("services").select("*").order("sort");
    if (!opts?.includeInactive) q = q.eq("active", true);
    return check(await q) ?? [];
  },
  async listWorkingHours() {
    const rows = check(await db().from("working_hours").select("barber_id, weekday, start_time, end_time")) ?? [];
    return rows.map((r) => ({ ...r, start_time: r.start_time.slice(0, 5), end_time: r.end_time.slice(0, 5) }));
  },
  async setWorkingHours(barberId, rows) {
    check(await db().from("working_hours").delete().eq("barber_id", barberId));
    if (rows.length) check(await db().from("working_hours").insert(rows.map((r) => ({ ...r, barber_id: barberId }))));
  },
  async updateService(id, patch) {
    check(await db().from("services").update(patch).eq("id", id));
  },
  async listTimeOff(fromIso, toIso) {
    return check(await db().from("time_off").select("*").lt("starts_at", toIso).gt("ends_at", fromIso).order("starts_at")) ?? [];
  },
  async createTimeOff(t) {
    check(await db().from("time_off").insert(t));
  },
  async deleteTimeOff(id) {
    check(await db().from("time_off").delete().eq("id", id));
  },
  async listBookings(fromIso, toIso, opts) {
    let q = db().from("bookings").select(BOOKING_SELECT).lt("starts_at", toIso).gt("ends_at", fromIso).order("starts_at");
    if (opts?.statuses) q = q.in("status", opts.statuses);
    return ((check(await q) ?? []) as BookingRow[]).map(mapBooking);
  },
  async getBooking(id) {
    const row = check(await db().from("bookings").select(BOOKING_SELECT).eq("id", id).maybeSingle());
    return row ? mapBooking(row as BookingRow) : null;
  },
  async getBookingByToken(token) {
    const row = check(await db().from("bookings").select(BOOKING_SELECT).eq("cancel_token", token).maybeSingle());
    return row ? mapBooking(row as BookingRow) : null;
  },
  async createBooking(input) {
    const { services, ...booking } = input;
    const created = check(await db().from("bookings").insert(booking).select("id").single()) as { id: string };
    const res = await db()
      .from("booking_services")
      .insert(
        services.map((s) => ({
          booking_id: created.id,
          service_id: s.service_id,
          price_cents: s.price_cents,
          duration_min: s.duration_min,
        })),
      );
    if (res.error) {
      await db().from("bookings").delete().eq("id", created.id);
      throw new Error(res.error.message);
    }
    return (await this.getBooking(created.id))!;
  },
  async updateBooking(id, patch) {
    check(await db().from("bookings").update(patch).eq("id", id));
  },
  async deleteBookingsEndingBefore(iso) {
    const rows = check(await db().from("bookings").delete().lt("ends_at", iso).select("id")) ?? [];
    return rows.length;
  },
};
