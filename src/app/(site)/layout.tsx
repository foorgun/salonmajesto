import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { StickyBookButton } from "@/components/StickyBookButton";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-paper focus:p-3">
        Zum Inhalt springen
      </a>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <StickyBookButton />
    </>
  );
}
