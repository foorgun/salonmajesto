import { describe, expect, it } from "vitest";
import { computeSlots, isDayOpen, pickLeastBusyBarber, type SlotInput } from "@/lib/slots";

// Di, 2026-11-03 (Winterzeit, UTC+1)
const DAY = "2026-11-03";
const hours = (barber: string, weekday: number, ...ranges: [string, string][]) =>
  ranges.map(([s, e]) => ({ barber_id: barber, weekday, start_time: s, end_time: e }));

function base(over: Partial<SlotInput> = {}): SlotInput {
  return {
    date: DAY,
    barberIds: ["a"],
    workingHours: hours("a", 2, ["09:00", "19:00"]),
    bookings: [],
    timeOff: [],
    durationMin: 30,
    now: new Date("2026-11-01T00:00:00Z"),
    stepMin: 15,
    bufferMin: 5,
    leadMin: 60,
    ...over,
  };
}

const times = (input: SlotInput) => computeSlots(input).map((s) => s.time);

describe("computeSlots", () => {
  it("respektiert Arbeitszeit-Grenzen inkl. Puffer", () => {
    const t = times(base());
    expect(t[0]).toBe("09:00");
    // 30 + 5 Puffer = 35 Min → letzter Start 18:15 (18:15 + 35 = 18:50), 18:30 + 35 = 19:05 passt nicht
    expect(t.at(-1)).toBe("18:15");
    expect(t).not.toContain("18:30");
  });

  it("liefert UTC-Zeitpunkte passend zur Berliner Zeit", () => {
    const [first] = computeSlots(base());
    expect(first.startsAt).toBe("2026-11-03T08:00:00.000Z");
  });

  it("berücksichtigt Pausen (mehrere Intervalle pro Tag)", () => {
    const t = times(base({ workingHours: hours("a", 2, ["09:00", "12:00"], ["13:00", "19:00"]) }));
    expect(t).toContain("11:15"); // 11:15 + 35 = 11:50
    expect(t).not.toContain("11:30"); // 11:30 + 35 = 12:05
    expect(t).not.toContain("12:00");
    expect(t).not.toContain("12:45");
    expect(t).toContain("13:00");
  });

  it("schließt Überschneidungen mit Buchungen aus", () => {
    const t = times(
      base({
        bookings: [{ barber_id: "a", starts_at: "2026-11-03T09:00:00Z", ends_at: "2026-11-03T09:50:00Z" }], // 10:00–10:50
      }),
    );
    expect(t).toContain("09:15"); // 09:15–09:50 endet genau vor 10:00? 09:15+35 = 09:50 ✓
    expect(t).not.toContain("09:30"); // 09:30–10:05 überschneidet
    expect(t).not.toContain("10:30");
    expect(t).toContain("11:00");
  });

  it("schließt Blockzeiten aus (Barber und ganzer Salon)", () => {
    const own = times(base({ timeOff: [{ barber_id: "a", starts_at: "2026-11-03T08:00:00Z", ends_at: "2026-11-03T12:00:00Z" }] }));
    expect(own[0]).toBe("13:00");
    const salon = times(base({ timeOff: [{ barber_id: null, starts_at: "2026-11-03T00:00:00Z", ends_at: "2026-11-04T00:00:00Z" }] }));
    expect(salon).toEqual([]);
    const other = times(base({ timeOff: [{ barber_id: "b", starts_at: "2026-11-03T00:00:00Z", ends_at: "2026-11-04T00:00:00Z" }] }));
    expect(other[0]).toBe("09:00");
  });

  it("beachtet den Mindestvorlauf von 60 Minuten", () => {
    const t = times(base({ now: new Date("2026-11-03T09:10:00Z") })); // 10:10 Berlin
    expect(t[0]).toBe("11:15");
  });

  it("liefert nichts an Tagen ohne Arbeitszeit", () => {
    expect(times(base({ date: "2026-11-02" }))).toEqual([]); // Montag
  });

  it("vereinigt Slots aller Barber bei „Schnellstmöglich“", () => {
    const slots = computeSlots(
      base({
        barberIds: ["a", "b"],
        workingHours: [...hours("a", 2, ["09:00", "12:00"]), ...hours("b", 2, ["11:00", "19:00"])],
      }),
    );
    expect(slots[0]).toMatchObject({ time: "09:00", barberIds: ["a"] });
    expect(slots.find((s) => s.time === "11:00")?.barberIds).toEqual(["a", "b"]);
    expect(slots.at(-1)?.barberIds).toEqual(["b"]);
  });

  it("wählt bei „Schnellstmöglich“ den am wenigsten ausgelasteten Barber", () => {
    const bookings = [
      { barber_id: "a", starts_at: "2026-11-03T08:00:00Z", ends_at: "2026-11-03T09:00:00Z" },
      { barber_id: "b", starts_at: "2026-11-03T08:00:00Z", ends_at: "2026-11-03T08:30:00Z" },
    ];
    expect(pickLeastBusyBarber(["a", "b", "c"], bookings)).toBe("c");
    expect(pickLeastBusyBarber(["a", "b"], bookings)).toBe("b");
  });
});

describe("Zeitumstellung", () => {
  it("Sommerzeit-Beginn (letzter So im März): Folgetag korrekt in UTC+2", () => {
    // 2027-03-28 ist der Umstellungs-Sonntag, Di 2027-03-30 liegt in Sommerzeit
    const [first] = computeSlots(base({ date: "2027-03-30", now: new Date("2027-03-01T00:00:00Z") }));
    expect(first.time).toBe("09:00");
    expect(first.startsAt).toBe("2027-03-30T07:00:00.000Z");
  });

  it("Umstellungstag selbst: Arbeitszeit am Sonntag der Umstellung (März)", () => {
    const slots = computeSlots(
      base({ date: "2027-03-28", workingHours: hours("a", 0, ["01:00", "05:00"]), now: new Date("2027-03-01T00:00:00Z"), durationMin: 10, bufferMin: 5 }),
    );
    // 01:00–05:00 Wandzeit sind wegen der übersprungenen Stunde nur 3 echte Stunden
    expect(slots[0].startsAt).toBe("2027-03-28T00:00:00.000Z");
    expect(slots.at(-1)!.startsAt).toBe("2027-03-28T02:45:00.000Z");
    expect(slots.length).toBe(12);
  });

  it("Winterzeit-Beginn (letzter So im Oktober): Tag davor UTC+2, Tag danach UTC+1", () => {
    const sat = computeSlots(base({ date: "2026-10-24", workingHours: hours("a", 6, ["09:00", "17:00"]), now: new Date("2026-10-01T00:00:00Z") }));
    expect(sat[0].startsAt).toBe("2026-10-24T07:00:00.000Z");
    const tue = computeSlots(base({ date: "2026-10-27", now: new Date("2026-10-01T00:00:00Z") }));
    expect(tue[0].startsAt).toBe("2026-10-27T08:00:00.000Z");
    expect(tue[0].time).toBe("09:00");
  });
});

describe("isDayOpen", () => {
  it("erkennt geschlossene Tage und Salon-Urlaub", () => {
    const b = base();
    expect(isDayOpen(b)).toBe(true);
    expect(isDayOpen({ ...b, date: "2026-11-02" })).toBe(false);
    expect(
      isDayOpen({ ...b, timeOff: [{ barber_id: null, starts_at: "2026-11-02T23:00:00Z", ends_at: "2026-11-03T23:00:00Z" }] }),
    ).toBe(false);
  });
});
