/**
 * Zentrale Stammdaten für Salon Majesto.
 * Alles, was mit `// TODO: prüfen` markiert ist, ist ein Platzhalter oder eine Schätzung.
 */

export const TIMEZONE = "Europe/Berlin";

export const salon = {
  name: "Salon Majesto",
  claim: "Präzise Cuts, saubere Fades, gepflegter Bart.",
  walkInNote: "Mit Termin oder einfach vorbeikommen.",
  instagramHandle: "salonmajesto",
  instagramUrl: "https://instagram.com/salonmajesto",
  address: {
    street: "Walfischgasse 1",
    zip: "89073",
    city: "Ulm",
    country: "DE",
  },
  phone: "0178 2521990",
  whatsapp: "491782521990", // TODO: prüfen – angenommen: WhatsApp läuft über die Handynummer (nur Ziffern, international, für wa.me)
  email: "info@salonmajesto.de", // TODO: prüfen
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Salon+Majesto+Walfischgasse+1+89073+Ulm",
  owner: "Vorname Nachname", // TODO: prüfen (Impressum)
  vatId: "DE000000000", // TODO: prüfen (Impressum, USt-IdNr.)
} as const;

/**
 * Öffnungszeiten. Wochentag nach JS-Konvention: 0 = Sonntag … 6 = Samstag.
 * Mehrere Intervalle pro Tag möglich (z. B. Mittagspause).
 */
export const openingHours: Record<number, [string, string][]> = {
  0: [],
  1: [],
  2: [["09:00", "19:00"]],
  3: [["09:00", "19:00"]],
  4: [["09:00", "19:00"]],
  5: [["09:00", "19:00"]],
  6: [["09:00", "17:00"]],
}; // TODO: prüfen

export const bookingConfig = {
  stepMin: 15,
  bufferMin: 5,
  leadMin: 60,
  horizonDays: 21,
  cancelUntilHoursBefore: 2,
  rateLimitPerHour: 5,
  retentionMonths: 12,
};

export type SeedBarber = { slug: string; name: string; photo: string };

// Reihenfolge = Anzeige auf der Website und im Buchungsflow
export const seedBarbers: SeedBarber[] = [
  { slug: "enes", name: "Enes", photo: "/images/team-enes.jpg" },
  // TODO: prüfen – Suad ist laut Instagram „wieder da“, war im Terminland-Formular aber nicht gelistet.
  { slug: "suad", name: "Suad", photo: "/images/team-suad.jpg" },
  { slug: "yasin", name: "Yasin", photo: "/images/team-yasin.jpg" },
  { slug: "yakup", name: "Yakup", photo: "/images/team-yakup.jpg" },
];

export type SeedService = {
  slug: string;
  name: string;
  priceCents: number;
  durationMin: number;
  isExtra: boolean;
};

// Dauern sind geschätzt. TODO: prüfen
export const seedServices: SeedService[] = [
  { slug: "haare", name: "Haare", priceCents: 2600, durationMin: 30, isExtra: false },
  { slug: "bart", name: "Bart", priceCents: 1600, durationMin: 20, isExtra: false },
  { slug: "augenbrauen", name: "Augenbrauen", priceCents: 700, durationMin: 10, isExtra: false },
  { slug: "haare-bart", name: "Haare & Bart", priceCents: 4200, durationMin: 45, isExtra: false },
  // TODO: prüfen – Preis geschätzt
  { slug: "haare-augenbrauen", name: "Haare & Augenbrauen", priceCents: 3300, durationMin: 35, isExtra: false },
  { slug: "haare-bart-augenbrauen", name: "Haare, Bart & Augenbrauen", priceCents: 4900, durationMin: 50, isExtra: false },
  // TODO: prüfen – Inhalt und Preis des Pakets
  { slug: "majesto-paket", name: "Salon Majesto Paket (all inclusive)", priceCents: 6500, durationMin: 70, isExtra: false },
  { slug: "waschen", name: "+ Waschen", priceCents: 600, durationMin: 10, isExtra: true },
  { slug: "gesichtshaare-wachsen", name: "Gesichtshaare wachsen", priceCents: 1000, durationMin: 10, isExtra: true },
  { slug: "ohren-nase-wachsen", name: "Ohren & Nase wachsen", priceCents: 600, durationMin: 5, isExtra: true },
];

/** Nur auf der Preisliste, nicht buchbar → WhatsApp. */
export const onRequestServices = [{ name: "Färben", note: "auf Anfrage" }];

export const images = {
  hero: "/images/hero.jpg",
  gallery: [
    { src: "/images/interior-1.jpg", alt: "Barber bei der Arbeit im Salon Majesto" },
    { src: "/images/cut-1.jpg", alt: "Textured Crop mit Fade bei Salon Majesto" },
    { src: "/images/cut-2.jpg", alt: "Kurzer Crop mit Skin Fade und gepflegtem Bart bei Salon Majesto" },
  ],
  instagram: ["/images/insta-1.jpg", "/images/insta-2.jpg", "/images/insta-3.jpg"],
};

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Telefonnummer international für tel:-Links und strukturierte Daten, z. B. +491782521990 */
export function phoneIntl() {
  return salon.phone.replace(/\s/g, "").replace(/^0/, "+49");
}

export function whatsappUrl(text?: string) {
  return `https://wa.me/${salon.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
