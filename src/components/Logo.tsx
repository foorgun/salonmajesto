/**
 * Logo von Salon Majesto, nachgezeichnet aus logo.png (Rasiermesser + Schere).
 * `currentColor` → funktioniert auf hellem und dunklem Grund.
 */

export function LogoMarkPaths() {
  return (
    <>
      <g fill="currentColor" fillRule="evenodd">
        {/* linkes Rasiermesser */}
        <path d="M232 350 Q440 431 692 462 L700 505 Q440 474 222 400 A26 26 0 0 1 232 350 Z M237 377 a9 9 0 1 0 0.1 0 Z" />
        <path d="M308 252 L343 228 L566 440 L529 468 Z M347 246 L351 242 L553 435 L549 439 Z" />
        {/* rechtes Rasiermesser (gespiegelt) */}
        <g transform="translate(1280 0) scale(-1 1)">
          <path d="M232 350 Q440 431 692 462 L700 505 Q440 474 222 400 A26 26 0 0 1 232 350 Z M237 377 a9 9 0 1 0 0.1 0 Z" />
          <path d="M308 252 L343 228 L566 440 L529 468 Z M347 246 L351 242 L553 435 L549 439 Z" />
        </g>
        {/* Scherenklingen */}
        <path d="M466 147 L478 150 L676 368 L636 414 L590 392 Z M636 368 a10 10 0 1 0 0.1 0 Z" />
        <path d="M813 148 L823 156 L694 346 L652 324 Z" />
      </g>
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M612 418 Q560 474 458 522" strokeWidth="14" />
        <path d="M668 418 Q720 474 826 522" strokeWidth="14" />
        <circle cx="420" cy="560" r="42" strokeWidth="13" />
        <circle cx="862" cy="560" r="42" strokeWidth="13" />
        <path d="M888 596 Q922 640 984 624" strokeWidth="13" />
        <path d="M600 474 Q648 560 690 604" strokeWidth="11" />
        <path d="M680 474 Q632 560 590 604" strokeWidth="11" />
      </g>
    </>
  );
}

export function LogoWordmarkPaths() {
  return (
    <g fill="currentColor" style={{ fontFamily: "var(--font-display, 'Bodoni Moda', Didot, Georgia, serif)" }}>
      <text x="636" y="694" textAnchor="middle" fontSize="46" letterSpacing="9">
        SALON
      </text>
      <text x="636" y="826" textAnchor="middle" fontSize="118" letterSpacing="38">
        MAJ<tspan fontSize="152">E</tspan>STO
      </text>
      <rect x="193" y="854" width="880" height="7" />
    </g>
  );
}

type Props = { className?: string; title?: string };

export function Logo({ className, title = "Salon Majesto" }: Props) {
  return (
    <svg viewBox="180 130 920 745" className={className} role="img" aria-label={title}>
      <LogoMarkPaths />
      <LogoWordmarkPaths />
    </svg>
  );
}

export function LogoMark({ className, title = "Salon Majesto" }: Props) {
  return (
    <svg viewBox="190 130 900 500" className={className} role="img" aria-label={title}>
      <LogoMarkPaths />
    </svg>
  );
}
