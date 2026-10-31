import Link from "next/link";
import { salon } from "@/config/salon";

export function Footer() {
  return (
    <footer className="bg-night pb-24 text-paper/70 md:pb-0">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-xs sm:flex-row sm:items-center sm:justify-between md:px-8">
        <p>© {salon.name}</p>
        <nav aria-label="Rechtliches" className="flex gap-4">
          <Link href="/impressum" className="hover:text-paper">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-paper">
            Datenschutz
          </Link>
          <Link href="/admin" className="hover:text-paper">
            Team-Login
          </Link>
        </nav>
      </div>
    </footer>
  );
}
