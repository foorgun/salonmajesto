import "server-only";
import { localRepo } from "./local";
import type { Repo } from "./repo";
import { supabaseRepo } from "./supabase";

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

/**
 * Online-Buchung nur mit dauerhafter Datenbank: Supabase oder lokal der Datei-Store.
 * Auf Vercel ohne Supabase zeigt /termin stattdessen Telefon/WhatsApp.
 */
export const bookingAvailable = isSupabaseConfigured || !process.env.VERCEL;

/** Supabase, sobald konfiguriert – sonst lokaler Datei-Store (.data/db.json) für die Entwicklung. */
export const repo: Repo = isSupabaseConfigured ? supabaseRepo : localRepo;
