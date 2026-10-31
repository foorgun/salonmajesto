import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/db";

export const isAuthConfigured = Boolean(
  isSupabaseConfigured && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/** Lokal ohne Supabase ist der Admin im Entwicklungsmodus offen (Hinweis-Banner im UI). */
export const isDevAdmin = !isAuthConfigured && process.env.NODE_ENV !== "production";

export async function supabaseAuthClient() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // In Server Components nicht setzbar – der Proxy erneuert die Session.
        }
      },
    },
  });
}

export type AdminUser = { email: string; dev: boolean };

export async function getAdmin(): Promise<AdminUser | null> {
  if (isDevAdmin) return { email: "dev@localhost", dev: true };
  if (!isAuthConfigured) return null;
  const supabase = await supabaseAuthClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  // Admin-Liste mit Service-Role prüfen (Tabelle `admins`)
  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data: row } = await service.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  return row ? { email: data.user.email ?? "", dev: false } : null;
}

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin");
  return admin;
}
