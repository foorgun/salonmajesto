import Link from "next/link";

export default function NotFound() {
  return (
    <main className="starfield flex min-h-dvh flex-col items-center justify-center px-5 text-center text-paper">
      <h1 className="headline text-6xl">Nicht gefunden.</h1>
      <p className="mt-4 text-sm text-paper/70">Diese Seite gibt es nicht (mehr).</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn btn-ghost-light">
          Startseite
        </Link>
        <Link href="/termin" className="btn btn-light">
          Termin buchen
        </Link>
      </div>
    </main>
  );
}
