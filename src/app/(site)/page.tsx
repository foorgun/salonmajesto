import Link from "next/link";
import { OpenStatus } from "@/components/OpenStatus";
import { Photo } from "@/components/Photo";
import { images, onRequestServices, openingHours, phoneIntl, salon, siteUrl, whatsappUrl } from "@/config/salon";
import { repo } from "@/lib/db";
import { groupedOpeningHours } from "@/lib/hours";
import { euro } from "@/lib/time";

// Preise & Team kommen aus der Datenbank; Änderungen im Admin revalidieren die Seite sofort.
export const revalidate = 300;

const DAY_SCHEMA = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function HomePage() {
  const [services, barbers] = await Promise.all([repo.listServices(), repo.listBarbers()]);
  const main = services.filter((s) => !s.is_extra);
  const extras = services.filter((s) => s.is_extra);
  const hours = groupedOpeningHours();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["BarberShop", "HairSalon"],
    name: salon.name,
    url: siteUrl(),
    image: `${siteUrl()}/opengraph-image`,
    logo: `${siteUrl()}/logo.png`,
    telephone: phoneIntl(),
    email: salon.email,
    priceRange: "€€",
    address: {
      "@type": "PostalAddress",
      streetAddress: salon.address.street,
      postalCode: salon.address.zip,
      addressLocality: salon.address.city,
      addressCountry: salon.address.country,
    },
    openingHoursSpecification: Object.entries(openingHours).flatMap(([wd, ranges]) =>
      ranges.map(([opens, closes]) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: DAY_SCHEMA[Number(wd)],
        opens,
        closes,
      })),
    ),
    sameAs: [salon.instagramUrl],
    potentialAction: {
      "@type": "ReserveAction",
      target: `${siteUrl()}/termin`,
      name: "Termin buchen",
    },
    makesOffer: services.map((s) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: s.name.replace(/^\+\s*/, "") },
      price: (s.price_cents / 100).toFixed(2),
      priceCurrency: "EUR",
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-night text-paper">
        {/*
          Interior-Foto: mobil als Bild oben, ab Tablet auf der rechten Hälfte (randlos bis zum Rand).
          Die Quelle ist klein (516 px) – daher bewusst nicht über die volle Breite gestreckt, damit es scharf bleibt.
        */}
        <div className="relative md:absolute md:inset-y-0 md:right-0 md:w-1/2">
          <Photo
            src={images.hero}
            alt="Salon Majesto – Innenraum mit Sternenhimmel-Decke"
            className="aspect-[4/3] w-full md:absolute md:inset-0 md:aspect-auto"
            sizes="(min-width: 768px) 50vw, 100vw"
            quality={85}
            priority
            imgClassName="object-[55%_40%] brightness-[.82]"
          />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-night to-transparent md:h-1/4" aria-hidden />
          <div className="absolute inset-y-0 left-0 hidden w-2/5 bg-gradient-to-r from-night to-transparent md:block" aria-hidden />
        </div>
        <div className="relative mx-auto flex max-w-6xl flex-col justify-end px-5 pb-14 -mt-10 md:mt-0 md:min-h-[560px] md:px-8 md:pb-16 md:pt-24">
          <OpenStatus className="text-paper/70" />
          <h1 className="headline mt-4 text-[clamp(4rem,14vw,7.5rem)]">
            Salon
            <br />
            Majesto
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-paper/80">
            {salon.claim} {salon.walkInNote}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/termin" className="btn btn-light">
              Termin buchen
            </Link>
            <Link href="/#preise" className="btn btn-ghost-light">
              Preise ansehen
            </Link>
          </div>
        </div>
      </section>

      {/* Preise */}
      <section id="preise" className="scroll-mt-16 border-b border-line">
        <div className="reveal mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
          <h2 className="headline text-6xl md:text-7xl">Preise</h2>
          <div className="mt-12 grid gap-x-12 md:grid-cols-2">
            <ul>
              {main.map((s) => (
                <PriceRow key={s.id} name={s.name} price={euro(s.price_cents)} />
              ))}
            </ul>
            <div>
              <ul>
                {extras.map((s) => (
                  <PriceRow key={s.id} name={s.name} price={`${euro(s.price_cents)}`} />
                ))}
                {onRequestServices.map((s) => (
                  <PriceRow
                    key={s.name}
                    name={s.name}
                    price={
                      <a href={whatsappUrl(`Hi, ich hätte eine Frage zu: ${s.name}`)} className="underline-offset-4 hover:underline">
                        {s.note}
                      </a>
                    }
                  />
                ))}
              </ul>
              <Link href="/termin" className="btn btn-dark mt-8">
                Jetzt buchen
              </Link>
            </div>
          </div>
          <p className="mt-10 text-sm text-mute">Bezahlung vor Ort. {salon.walkInNote}</p>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="scroll-mt-16">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
          <h2 className="headline reveal text-6xl md:text-7xl">Team</h2>
          <ul className="mt-12 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-x-3">
            {barbers.map((b) => (
              <li key={b.id} className="reveal group">
                <Link href={`/termin?barber=${b.slug}`} aria-label={`Bei ${b.name} buchen`}>
                  <Photo
                    src={b.photo_url ?? `/images/team-${b.slug}.jpg`}
                    alt={`${b.name}, Barber bei Salon Majesto`}
                    className="aspect-[4/5] bg-night"
                    sizes="(min-width: 768px) 25vw, 50vw"
                    imgClassName="grayscale transition duration-500 group-hover:grayscale-0"
                  />
                </Link>
                <h3 className="mt-4 font-label text-2xl font-semibold uppercase tracking-wide">{b.name}</h3>
                <Link href={`/termin?barber=${b.slug}`} className="link-arrow mt-1 inline-block">
                  Bei {b.name} buchen →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Salon-Galerie */}
      <section id="salon" className="scroll-mt-16 border-b border-line" aria-label="Der Salon">
        <div className="reveal mx-auto grid max-w-6xl grid-cols-2 gap-2 px-5 pb-20 md:grid-cols-3 md:px-8 md:pb-24">
          {images.gallery.map((img, i) => (
            <Photo
              key={img.src}
              src={img.src}
              alt={img.alt}
              className={`aspect-[4/5] ${i === 0 ? "col-span-2 md:col-span-1" : ""}`}
              sizes={i === 0 ? "(min-width: 768px) 33vw, 100vw" : "(min-width: 768px) 33vw, 50vw"}
            />
          ))}
        </div>
      </section>

      {/* Instagram */}
      <section className="bg-night text-paper" aria-labelledby="insta-title">
        <div className="reveal mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-[1fr_2fr] md:items-end md:px-8">
          <div>
            <p className="label text-paper/60">Instagram</p>
            <h2 id="insta-title" className="headline mt-3 text-5xl">
              @{salon.instagramHandle}
            </h2>
            <p className="mt-4 max-w-xs text-sm text-paper/70">Neue Cuts, freie Termine und Aktionen – zuerst auf Instagram.</p>
            <a href={salon.instagramUrl} target="_blank" rel="noopener noreferrer" className="btn btn-light mt-8">
              @{salon.instagramHandle} folgen
            </a>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {images.instagram.map((src, i) => (
              <Photo key={src} src={src} alt={`Salon Majesto auf Instagram, Bild ${i + 1}`} className="aspect-square border border-paper/10" sizes="(min-width: 768px) 22vw, 33vw" />
            ))}
          </div>
        </div>
      </section>

      {/* Info / Kontakt */}
      <section id="kontakt" className="scroll-mt-16">
        <div className="reveal mx-auto grid max-w-6xl gap-10 px-5 py-20 text-[15px] leading-relaxed md:grid-cols-3 md:px-8 md:py-24">
          <div>
            <h2 className="label">Adresse</h2>
            <address className="mt-4 not-italic">
              {salon.address.street}
              <br />
              {salon.address.zip} {salon.address.city}
            </address>
            <a href={salon.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block underline underline-offset-4">
              Route planen
            </a>
          </div>
          <div>
            <h2 className="label">Öffnungszeiten</h2>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4">
              {hours.map((h) => (
                <div key={h.days} className="contents">
                  <dt>{h.days}</dt>
                  <dd className="tabular-nums">{h.hours}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm text-mute">Mit und ohne Termin.</p>
          </div>
          <div>
            <h2 className="label">Kontakt</h2>
            <ul className="mt-4">
              <li>
                <a href={`tel:${phoneIntl()}`} className="hover:underline">
                  {salon.phone}
                </a>
              </li>
              <li>
                <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  WhatsApp
                </a>
                {" · "}
                <a href={salon.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  Instagram
                </a>
              </li>
              <li>@{salon.instagramHandle}</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

function PriceRow({ name, price }: { name: string; price: React.ReactNode }) {
  return (
    <li className="flex items-baseline justify-between gap-4 border-b border-line py-4 text-[15px]">
      <span>{name}</span>
      <span className="tabular-nums">{price}</span>
    </li>
  );
}
