import "server-only";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { openingHours, seedBarbers, seedServices } from "@/config/salon";
import type { Barber, Booking, Service, TimeOff, WorkingHour } from "@/lib/types";
import { SlotTakenError } from "@/lib/types";
import type { BookingPatch, Repo } from "./repo";

/**
 * Lokaler Datei-Store (.data/db.json) für die Entwicklung ohne Supabase.
 * Alle Operationen sind synchron → innerhalb eines Node-Prozesses atomar.
 * Bildet den Exclusion Constraint der Datenbank nach.
 */

type Db = {
  barbers: Barber[];
  services: Service[];
  working_hours: WorkingHour[];
  time_off: TimeOff[];
  bookings: Booking[];
};

const FILE = path.join(process.cwd(), ".data", "db.json");

function seed(): Db {
  const barbers: Barber[] = seedBarbers.map((b, i) => ({
    id: randomUUID(),
    slug: b.slug,
    name: b.name,
    photo_url: b.photo,
    active: true,
    sort: i,
  }));
  return {
    barbers,
    services: seedServices.map((s, i) => ({
      id: randomUUID(),
      slug: s.slug,
      name: s.name,
      price_cents: s.priceCents,
      duration_min: s.durationMin,
      is_extra: s.isExtra,
      active: true,
      sort: i,
    })),
    working_hours: barbers.flatMap((b) =>
      Object.entries(openingHours).flatMap(([wd, ranges]) =>
        ranges.map(([start, end]) => ({ barber_id: b.id, weekday: Number(wd), start_time: start, end_time: end })),
      ),
    ),
    time_off: [],
    bookings: [],
  };
}

// Auf Vercel ist das Dateisystem schreibgeschützt: dort nur Seed-Daten im Speicher (Buchung ist dann deaktiviert, siehe bookingAvailable).
const memoryOnly = Boolean(process.env.VERCEL);
let memory: Db | null = null;

function load(): Db {
  if (memoryOnly) return (memory ??= seed());
  if (!fs.existsSync(FILE)) {
    const db = seed();
    save(db);
    return db;
  }
  return JSON.parse(fs.readFileSync(FILE, "utf8")) as Db;
}

function save(db: Db) {
  if (memoryOnly) return;
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

const intersects = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  Date.parse(aStart) < Date.parse(bEnd) && Date.parse(bStart) < Date.parse(aEnd);

function assertNoOverlap(db: Db, b: Pick<Booking, "id" | "barber_id" | "starts_at" | "ends_at" | "status">) {
  if (b.status === "cancelled") return;
  const clash = db.bookings.some(
    (o) =>
      o.id !== b.id &&
      o.status !== "cancelled" &&
      o.barber_id === b.barber_id &&
      intersects(o.starts_at, o.ends_at, b.starts_at, b.ends_at),
  );
  if (clash) throw new SlotTakenError();
}

const bySort = <T extends { sort: number }>(a: T, b: T) => a.sort - b.sort;

export const localRepo: Repo = {
  async listBarbers(opts) {
    return load().barbers.filter((b) => opts?.includeInactive || b.active).sort(bySort);
  },
  async listServices(opts) {
    return load().services.filter((s) => opts?.includeInactive || s.active).sort(bySort);
  },
  async listWorkingHours() {
    return load().working_hours;
  },
  async setWorkingHours(barberId, rows) {
    const db = load();
    db.working_hours = [
      ...db.working_hours.filter((w) => w.barber_id !== barberId),
      ...rows.map((r) => ({ ...r, barber_id: barberId })),
    ];
    save(db);
  },
  async updateService(id, patch) {
    const db = load();
    db.services = db.services.map((s) => (s.id === id ? { ...s, ...patch } : s));
    save(db);
  },
  async listTimeOff(fromIso, toIso) {
    return load().time_off.filter((t) => intersects(t.starts_at, t.ends_at, fromIso, toIso));
  },
  async createTimeOff(t) {
    const db = load();
    db.time_off.push({ ...t, id: randomUUID() });
    save(db);
  },
  async deleteTimeOff(id) {
    const db = load();
    db.time_off = db.time_off.filter((t) => t.id !== id);
    save(db);
  },
  async listBookings(fromIso, toIso, opts) {
    return load()
      .bookings.filter(
        (b) =>
          intersects(b.starts_at, b.ends_at, fromIso, toIso) && (!opts?.statuses || opts.statuses.includes(b.status)),
      )
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  },
  async getBooking(id) {
    return load().bookings.find((b) => b.id === id) ?? null;
  },
  async getBookingByToken(token) {
    return load().bookings.find((b) => b.cancel_token === token) ?? null;
  },
  async createBooking(input) {
    const db = load();
    const booking: Booking = {
      ...input,
      id: randomUUID(),
      status: "confirmed",
      reminder_sent_at: null,
      created_at: new Date().toISOString(),
    };
    assertNoOverlap(db, booking);
    db.bookings.push(booking);
    save(db);
    return booking;
  },
  async updateBooking(id, patch: BookingPatch) {
    const db = load();
    const i = db.bookings.findIndex((b) => b.id === id);
    if (i < 0) return;
    const next = { ...db.bookings[i], ...patch };
    assertNoOverlap(db, next);
    db.bookings[i] = next;
    save(db);
  },
  async deleteBookingsEndingBefore(iso) {
    const db = load();
    const before = db.bookings.length;
    db.bookings = db.bookings.filter((b) => Date.parse(b.ends_at) >= Date.parse(iso));
    save(db);
    return before - db.bookings.length;
  },
};
