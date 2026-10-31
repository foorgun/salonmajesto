import fs from "node:fs";
import path from "node:path";
import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  quality?: number;
  imgClassName?: string;
};

/**
 * Zeigt ein Foto aus /public/images, sobald es existiert.
 * Bis dahin: dunkle Fläche mit Sternenpunkt-Muster (keine Stockfotos).
 */
export function Photo({ src, alt, className = "", sizes = "100vw", priority, quality, imgClassName = "" }: Props) {
  const exists = fs.existsSync(path.join(process.cwd(), "public", src));
  const positioned = /(^|\s)(absolute|fixed)(\s|$)/.test(className);
  return (
    <div className={`${positioned ? "" : "relative"} overflow-hidden ${className}`}>
      {exists ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} quality={quality} className={`object-cover ${imgClassName}`} />
      ) : (
        <div className="starfield absolute inset-0" role="img" aria-label={alt} />
      )}
    </div>
  );
}
