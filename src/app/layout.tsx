import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, DM_Sans, Oswald } from "next/font/google";
import Script from "next/script";
import { RevealObserver } from "@/components/Reveal";
import { salon, siteUrl } from "@/config/salon";
import "./globals.css";

// next/font lädt die Schriften beim Build und hostet sie selbst – kein Google-CDN zur Laufzeit (DSGVO).
const bodoni = Bodoni_Moda({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-bodoni", display: "swap" });
const oswald = Oswald({ subsets: ["latin"], weight: ["600"], variable: "--font-oswald", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${salon.name} – Barber · Termin online buchen`,
    template: `%s · ${salon.name}`,
  },
  description: `${salon.claim} ${salon.walkInNote} Termin in unter einer Minute online buchen.`,
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: salon.name,
  },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const plausible = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  return (
    <html lang="de" className={`${bodoni.variable} ${oswald.variable} ${dmSans.variable}`}>
      <body className="flex min-h-dvh flex-col">
        {children}
        <RevealObserver />
        {plausible && (
          <Script defer data-domain={plausible} src="https://plausible.io/js/script.js" strategy="afterInteractive" />
        )}
      </body>
    </html>
  );
}
