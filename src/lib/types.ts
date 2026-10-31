export type Barber = {
  id: string;
  slug: string;
  name: string;
  photo_url: string | null;
  active: boolean;
  sort: number;
};

export type Service = {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  duration_min: number;
  is_extra: boolean;
  active: boolean;
  sort: number;
};

/** weekday: 0 = Sonntag … 6 = Samstag; Zeiten als "HH:MM" */
export type WorkingHour = {
  barber_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

export type TimeOff = {
  id: string;
  barber_id: string | null;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

export type BookingStatus = "confirmed" | "cancelled" | "no_show";
export type BookingSource = "online" | "admin" | "walk_in";

export type BookingService = {
  service_id: string;
  name: string;
  price_cents: number;
  duration_min: number;
};

export type Booking = {
  id: string;
  barber_id: string;
  starts_at: string;
  ends_at: string;
  customer_name: string;
  phone: string;
  email: string | null;
  is_returning: boolean;
  note: string | null;
  status: BookingStatus;
  cancel_token: string;
  source: BookingSource;
  reminder_sent_at: string | null;
  created_at: string;
  services: BookingService[];
};

export type NewBooking = Omit<Booking, "id" | "created_at" | "reminder_sent_at" | "status" | "cancel_token"> & {
  cancel_token: string;
};

export class SlotTakenError extends Error {
  constructor() {
    super("Dieser Slot wurde gerade vergeben.");
    this.name = "SlotTakenError";
  }
}
