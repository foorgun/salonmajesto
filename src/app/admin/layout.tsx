import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "./actions";
import { Logo } from "@/components/Logo";
import { getAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-night text-paper">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
          <Link href="/admin" aria-label="Admin – Tagesansicht">
            <Logo className="h-8 w-auto" />
          </Link>
          {admin && (
            <nav className="flex items-center gap-4 text-[11px] uppercase tracking-[0.14em]">
              <Link href="/admin" className="hover:underline">
                Tag
              </Link>
              <Link href="/admin/einstellungen" className="hover:underline">
                Einstellungen
              </Link>
              {!admin.dev && (
                <form action={logout}>
                  <button className="uppercase tracking-[0.14em] hover:underline">Logout</button>
                </form>
              )}
            </nav>
          )}
        </div>
      </header>
      {admin?.dev && (
        <p className="bg-ink px-4 py-2 text-center text-xs text-paper/80">
          Entwicklungsmodus: Supabase nicht konfiguriert – Admin ohne Login, Daten in <code>.data/db.json</code>.
        </p>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}
