"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Mobiler Sticky-Button „Termin buchen“ – ausgeblendet im Buchungsflow und im Admin. */
export function StickyBookButton() {
  const pathname = usePathname();
  if (pathname.startsWith("/termin") || pathname.startsWith("/admin")) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
      <Link href="/termin" className="btn btn-dark w-full">
        Termin buchen
      </Link>
    </div>
  );
}
