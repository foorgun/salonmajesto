import "server-only";
import { localRepo } from "./local";
import type { Repo } from "./repo";
import { supabaseRepo } from "./supabase";

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

/**
 * Demo-Modus: Buchungsflow voll klickbar, aber es wird nichts gespeichert und keine Mail verschickt.
 * Automatisch auf Vercel ohne Supabase (kein dauerhafter Speicher) oder erzwungen per BOOKING_DEMO=1.
 */
export const isBookingDemo =
  process.env.BOOKING_DEMO === "1" || (!isSupabaseConfigured && Boolean(process.env.VERCEL));

/** Supabase, sobald konfiguriert – sonst lokaler Datei-Store (.data/db.json) für die Entwicklung. */
export const repo: Repo = isSupabaseConfigured ? supabaseRepo : localRepo;
