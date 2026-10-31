import "server-only";
import { localRepo } from "./local";
import type { Repo } from "./repo";
import { supabaseRepo } from "./supabase";

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

/** Supabase, sobald konfiguriert – sonst lokaler Datei-Store (.data/db.json) für die Entwicklung. */
export const repo: Repo = isSupabaseConfigured ? supabaseRepo : localRepo;
