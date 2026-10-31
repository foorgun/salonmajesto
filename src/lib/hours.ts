import { openingHours } from "@/config/salon";

export const WEEKDAYS_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
export const WEEKDAYS_LONG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

function berlinNow(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { weekday, time: `${get("hour")}:${get("minute")}` };
}

export type OpenStatus = { open: boolean; text: string };

/** „Heute geöffnet · 09:00–19:00“ bzw. nächste Öffnung – live aus den Öffnungszeiten */
export function openStatus(now = new Date()): OpenStatus {
  const { weekday, time } = berlinNow(now);
  const today = openingHours[weekday] ?? [];
  const later = today.filter(([, end]) => end > time);
  if (later.length) {
    const span = `${today[0][0]}–${today.at(-1)![1]}`;
    return { open: true, text: `Heute geöffnet · ${span}` };
  }
  for (let i = 1; i <= 7; i++) {
    const wd = (weekday + i) % 7;
    const ranges = openingHours[wd] ?? [];
    if (ranges.length) {
      const day = i === 1 ? "morgen" : WEEKDAYS_LONG[wd];
      return { open: false, text: `Heute geschlossen · ${day} ab ${ranges[0][0]}` };
    }
  }
  return { open: false, text: "Geschlossen" };
}

/** Gruppierte Öffnungszeiten für die Anzeige, z. B. „Di – Fr  09:00 – 19:00“ */
export function groupedOpeningHours(): { days: string; hours: string }[] {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const label = (wd: number) => {
    const r = openingHours[wd] ?? [];
    return r.length ? r.map(([s, e]) => `${s} – ${e}`).join(", ") : "geschlossen";
  };
  const groups: { from: number; to: number; hours: string }[] = [];
  for (const wd of order) {
    const h = label(wd);
    const last = groups.at(-1);
    if (last && last.hours === h) last.to = wd;
    else groups.push({ from: wd, to: wd, hours: h });
  }
  // „So – Mo geschlossen“ wie im Design: geschlossene Tage am Rand zusammenführen
  if (groups.length > 1 && groups[0].hours === groups.at(-1)!.hours) {
    const first = groups.shift()!;
    groups.at(-1)!.to = first.to;
  }
  const closed = groups.filter((g) => g.hours === "geschlossen");
  const open = groups.filter((g) => g.hours !== "geschlossen");
  return [...open, ...closed].map((g) => ({
    days: g.from === g.to ? WEEKDAYS_SHORT[g.from] : `${WEEKDAYS_SHORT[g.from]} – ${WEEKDAYS_SHORT[g.to]}`,
    hours: g.hours,
  }));
}
