import Link from "next/link";
import { Logo } from "@/components/Logo";

const nav = [
  { href: "/#preise", label: "Preise" },
  { href: "/#team", label: "Team" },
  { href: "/#salon", label: "Salon" },
  { href: "/#kontakt", label: "Kontakt" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-night text-paper">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:h-[72px] md:px-8">
        <Link href="/" aria-label="Salon Majesto – Startseite" className="-m-2 p-2">
          <Logo className="h-9 w-auto md:h-10" />
        </Link>
        <nav aria-label="Hauptnavigation" className="hidden md:block">
          <ul className="flex gap-9">
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="text-[11px] uppercase tracking-[0.14em] text-paper/80 hover:text-paper">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Link href="/termin" className="btn btn-light px-4 py-2.5 md:px-6 md:py-3">
          Termin buchen
        </Link>
      </div>
    </header>
  );
}
