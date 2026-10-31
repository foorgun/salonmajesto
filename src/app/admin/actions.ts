"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { bookingConfig, siteUrl } from "@/config/salon";
import { isAuthConfigured, requireAdmin, supabaseAuthClient } from "@/lib/auth";
import { newCancelToken, resolveServices } from "@/lib/booking";
import { repo } from "@/lib/db";
import { sendCancellation } from "@/lib/mail";
import { berlinDate, berlinToUtc, isValidDate } from "@/lib/time";
import { SlotTakenError, type BookingSource } from "@/lib/types";

const back = (date: string, msg?: string): never =>
  redirect(`/admin?date=${date}${msg ? `&msg=${encodeURIComponent(msg)}` : ""}`);

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

// --- Login ---

export async function sendMagicLink(fd: FormData) {
  const email = str(fd, "email");
  if (!isAuthConfigured || !z.email().safeParse(email).success) redirect("/admin?msg=Bitte+gültige+E-Mail+eingeben");
  const supabase = await supabaseAuthClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback`, shouldCreateUser: false },
  });
  if (error) console.error("[admin] Magic Link:", error.message);
  // Immer dieselbe Antwort – verrät nicht, ob die Adresse existiert.
  redirect("/admin?sent=1");
}

export async function logout() {
  if (isAuthConfigured) {
    const supabase = await supabaseAuthClient();
    await supabase.auth.signOut();
  }
  redirect("/admin");
}

// --- Termine ---

export async function setStatus(id: string, status: "cancelled" | "no_show" | "confirmed", date: string) {
  await requireAdmin();
  const booking = await repo.getBooking(id);
  if (!booking) back(date, "Termin nicht gefunden");
  try {
    await repo.updateBooking(id, { status });
  } catch (e) {
    if (e instanceof SlotTakenError) back(date, "Slot ist inzwischen belegt – Termin kann nicht reaktiviert werden.");
    throw e;
  }
  if (status === "cancelled" && booking!.status === "confirmed" && Date.parse(booking!.starts_at) > Date.now()) {
    const barber = (await repo.listBarbers({ includeInactive: true })).find((b) => b.id === booking!.barber_id);
    await sendCancellation(booking!, barber?.name ?? "");
  }
  revalidatePath("/admin");
  back(date, status === "cancelled" ? "Termin storniert" : status === "no_show" ? "Als No-Show markiert" : "Termin wiederhergestellt");
}

export async function moveBooking(id: string, fd: FormData) {
  await requireAdmin();
  const date = str(fd, "date");
  const time = str(fd, "time");
  const barberId = str(fd, "barber_id");
  const booking = await repo.getBooking(id);
  if (!booking || !isValidDate(date) || !/^\d{2}:\d{2}$/.test(time)) back(berlinDate(new Date()), "Ungültige Eingabe");
  const length = Date.parse(booking!.ends_at) - Date.parse(booking!.starts_at);
  const start = berlinToUtc(date, time);
  try {
    await repo.updateBooking(id, {
      barber_id: barberId || booking!.barber_id,
      starts_at: start.toISOString(),
      ends_at: new Date(start.getTime() + length).toISOString(),
      reminder_sent_at: null,
    });
  } catch (e) {
    if (e instanceof SlotTakenError) back(date, "Überschneidung mit einem anderen Termin");
    throw e;
  }
  revalidatePath("/admin");
  back(date, "Termin verschoben");
}

export async function createAdminBooking(fd: FormData) {
  await requireAdmin();
  const date = str(fd, "date");
  const time = str(fd, "time");
  if (!isValidDate(date) || !/^\d{2}:\d{2}$/.test(time)) back(berlinDate(new Date()), "Datum/Uhrzeit fehlt");

  const services = resolveServices(await repo.listServices(), [str(fd, "service"), ...fd.getAll("extras").map(String)]);
  if (!services) back(date, "Bitte eine Leistung wählen");
  const name = str(fd, "name") || "Walk-in";
  const source: BookingSource = str(fd, "source") === "walk_in" ? "walk_in" : "admin";
  const duration = services!.reduce((s, x) => s + x.duration_min, 0) + bookingConfig.bufferMin;
  const start = berlinToUtc(date, time);
  try {
    await repo.createBooking({
      barber_id: str(fd, "barber_id"),
      starts_at: start.toISOString(),
      ends_at: new Date(start.getTime() + duration * 60_000).toISOString(),
      customer_name: name,
      phone: str(fd, "phone"),
      email: str(fd, "email") || null,
      is_returning: true,
      note: str(fd, "note") || null,
      cancel_token: newCancelToken(),
      source,
      services: services!.map((s) => ({ service_id: s.id, name: s.name, price_cents: s.price_cents, duration_min: s.duration_min })),
    });
  } catch (e) {
    if (e instanceof SlotTakenError) back(date, "Überschneidung mit einem anderen Termin");
    throw e;
  }
  revalidatePath("/admin");
  back(date, "Termin angelegt");
}

// --- Blockzeiten ---

export async function createTimeOff(fd: FormData) {
  await requireAdmin();
  const fromDate = str(fd, "from_date");
  const toDate = str(fd, "to_date") || fromDate;
  const fromTime = str(fd, "from_time") || "00:00";
  const toTime = str(fd, "to_time") || "23:59";
  if (!isValidDate(fromDate) || !isValidDate(toDate)) back(berlinDate(new Date()), "Datum fehlt");
  const starts = berlinToUtc(fromDate, fromTime);
  const ends = berlinToUtc(toDate, toTime);
  if (ends <= starts) back(fromDate, "Ende muss nach dem Beginn liegen");
  await repo.createTimeOff({
    barber_id: str(fd, "barber_id") || null,
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
    reason: str(fd, "reason") || null,
  });
  revalidatePath("/admin");
  back(fromDate, "Blockzeit gespeichert");
}

export async function deleteTimeOff(id: string, date: string) {
  await requireAdmin();
  await repo.deleteTimeOff(id);
  revalidatePath("/admin");
  back(date, "Blockzeit gelöscht");
}

// --- Einstellungen ---

export async function updateService(id: string, fd: FormData) {
  await requireAdmin();
  const price = Math.round(Number(str(fd, "price").replace(",", ".")) * 100);
  const duration = Number(str(fd, "duration"));
  if (!Number.isFinite(price) || price < 0 || !Number.isInteger(duration) || duration <= 0) {
    redirect("/admin/einstellungen?msg=Ungültiger+Preis+oder+Dauer");
  }
  await repo.updateService(id, {
    name: str(fd, "name"),
    price_cents: price,
    duration_min: duration,
    active: fd.get("active") === "on",
  });
  revalidatePath("/", "layout");
  redirect("/admin/einstellungen?msg=Leistung+gespeichert");
}

/** Eingabe je Wochentag: „09:00-13:00, 14:00-19:00“ – leer = frei */
export async function updateWorkingHours(barberId: string, fd: FormData) {
  await requireAdmin();
  const rows: { weekday: number; start_time: string; end_time: string }[] = [];
  for (let wd = 0; wd < 7; wd++) {
    const raw = str(fd, `wd${wd}`);
    if (!raw) continue;
    for (const part of raw.split(",")) {
      const m = part.trim().match(/^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/);
      if (!m) redirect(`/admin/einstellungen?msg=${encodeURIComponent(`Format ungültig: „${part.trim()}“ (z. B. 09:00-19:00)`)}`);
      const start = `${m![1].padStart(2, "0")}:${m![2]}`;
      const end = `${m![3].padStart(2, "0")}:${m![4]}`;
      if (end <= start) redirect("/admin/einstellungen?msg=Ende+muss+nach+Beginn+liegen");
      rows.push({ weekday: wd, start_time: start, end_time: end });
    }
  }
  await repo.setWorkingHours(barberId, rows);
  revalidatePath("/", "layout");
  redirect("/admin/einstellungen?msg=Arbeitszeiten+gespeichert");
}
