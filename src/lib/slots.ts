import { berlinToUtc, weekdayOf } from "@/lib/time";

export type Interval = { start: number; end: number }; // ms epoch, end exklusiv

export type SlotInput = {
  date: string; // YYYY-MM-DD (Berlin)
  barberIds: string[];
  workingHours: { barber_id: string; weekday: number; start_time: string; end_time: string }[];
  /** nicht stornierte Buchungen (ends_at inkl. Puffer) */
  bookings: { barber_id: string; starts_at: string; ends_at: string }[];
  /** barber_id null = ganzer Salon */
  timeOff: { barber_id: string | null; starts_at: string; ends_at: string }[];
  durationMin: number;
  now: Date;
  stepMin: number;
  bufferMin: number;
  leadMin: number;
};

export type Slot = {
  /** "HH:MM" Berliner Zeit */
  time: string;
  startsAt: string;
  /** Barber, die diesen Slot frei haben */
  barberIds: string[];
};

const MIN = 60_000;

function overlaps(a: Interval, b: Interval) {
  return a.start < b.end && b.start < a.end;
}

function toInterval(x: { starts_at: string; ends_at: string }): Interval {
  return { start: Date.parse(x.starts_at), end: Date.parse(x.ends_at) };
}

/** Arbeitsintervalle eines Barbers an einem Tag als UTC-Intervalle */
export function workIntervals(input: Pick<SlotInput, "date" | "workingHours">, barberId: string): Interval[] {
  const wd = weekdayOf(input.date);
  return input.workingHours
    .filter((w) => w.barber_id === barberId && w.weekday === wd)
    .map((w) => ({
      start: berlinToUtc(input.date, w.start_time.slice(0, 5)).getTime(),
      end: berlinToUtc(input.date, w.end_time.slice(0, 5)).getTime(),
    }))
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start);
}

/**
 * Freie Slots für einen Tag. Ein Slot ist frei, wenn Dauer + Puffer komplett in ein
 * Arbeitsintervall passt und sich mit keiner Buchung/Blockzeit überschneidet.
 * Mehrere Barber → Vereinigung („Schnellstmöglich“), je Slot mit Liste der freien Barber.
 */
export function computeSlots(input: SlotInput): Slot[] {
  const total = (input.durationMin + input.bufferMin) * MIN;
  const earliest = input.now.getTime() + input.leadMin * MIN;
  const byStart = new Map<number, string[]>();

  for (const barberId of input.barberIds) {
    const blocked = [
      ...input.bookings.filter((b) => b.barber_id === barberId).map(toInterval),
      ...input.timeOff.filter((t) => t.barber_id === null || t.barber_id === barberId).map(toInterval),
    ];
    for (const work of workIntervals(input, barberId)) {
      for (let start = work.start; start + total <= work.end; start += input.stepMin * MIN) {
        if (start < earliest) continue;
        const slot = { start, end: start + total };
        if (blocked.some((b) => overlaps(slot, b))) continue;
        const list = byStart.get(start) ?? [];
        list.push(barberId);
        byStart.set(start, list);
      }
    }
  }

  return [...byStart.entries()]
    .sort(([a], [b]) => a - b)
    .map(([start, barberIds]) => {
      const d = new Date(start);
      return {
        time: new Intl.DateTimeFormat("de-DE", {
          timeZone: "Europe/Berlin",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(d),
        startsAt: d.toISOString(),
        barberIds,
      };
    });
}

/**
 * „Schnellstmöglich“: Aus den freien Barbern den mit der geringsten Auslastung
 * (gebuchte Minuten) an diesem Tag wählen. Gleichstand → Reihenfolge in `candidates`.
 */
export function pickLeastBusyBarber(
  candidates: string[],
  dayBookings: { barber_id: string; starts_at: string; ends_at: string }[],
): string {
  const load = new Map(candidates.map((id) => [id, 0]));
  for (const b of dayBookings) {
    if (load.has(b.barber_id)) {
      load.set(b.barber_id, load.get(b.barber_id)! + (Date.parse(b.ends_at) - Date.parse(b.starts_at)));
    }
  }
  return candidates.reduce((best, id) => (load.get(id)! < load.get(best)! ? id : best), candidates[0]);
}

/** Hat irgendein Barber an diesem Tag Arbeitszeit, die nicht komplett durch Salon-Blockzeiten belegt ist? */
export function isDayOpen(input: Pick<SlotInput, "date" | "workingHours" | "timeOff" | "barberIds">): boolean {
  const salonOff = input.timeOff.filter((t) => t.barber_id === null).map(toInterval);
  return input.barberIds.some((id) =>
    workIntervals(input, id).some((w) => !salonOff.some((o) => o.start <= w.start && o.end >= w.end)),
  );
}
