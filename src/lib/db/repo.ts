import type { Barber, Booking, BookingStatus, NewBooking, Service, TimeOff, WorkingHour } from "@/lib/types";

export type BookingPatch = Partial<Pick<Booking, "status" | "starts_at" | "ends_at" | "barber_id" | "reminder_sent_at">>;

/** Gemeinsame Schnittstelle für Supabase (Produktion) und den lokalen Datei-Store (Entwicklung). */
export interface Repo {
  listBarbers(opts?: { includeInactive?: boolean }): Promise<Barber[]>;
  listServices(opts?: { includeInactive?: boolean }): Promise<Service[]>;
  listWorkingHours(): Promise<WorkingHour[]>;
  setWorkingHours(barberId: string, rows: Omit<WorkingHour, "barber_id">[]): Promise<void>;
  updateService(id: string, patch: Partial<Pick<Service, "name" | "price_cents" | "duration_min" | "active">>): Promise<void>;

  listTimeOff(fromIso: string, toIso: string): Promise<TimeOff[]>;
  createTimeOff(t: Omit<TimeOff, "id">): Promise<void>;
  deleteTimeOff(id: string): Promise<void>;

  /** Buchungen, die das Intervall schneiden */
  listBookings(fromIso: string, toIso: string, opts?: { statuses?: BookingStatus[] }): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | null>;
  getBookingByToken(token: string): Promise<Booking | null>;
  /** wirft SlotTakenError bei Überschneidung */
  createBooking(b: NewBooking): Promise<Booking>;
  /** wirft SlotTakenError bei Überschneidung */
  updateBooking(id: string, patch: BookingPatch): Promise<void>;
  deleteBookingsEndingBefore(iso: string): Promise<number>;
}
