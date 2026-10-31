import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { salon } from "@/config/salon";

export const alt = `${salon.name} – Termin buchen`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const svg = (await readFile(path.join(process.cwd(), "public", "logo-mark.svg"), "utf8")).replace('color="#141414"', 'color="#EDEDED"');
  const mark = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  const stars = Array.from({ length: 70 }, (_, i) => ({
    x: (i * 137.5) % 1200,
    y: (i * 89.3) % 630,
    s: i % 5 === 0 ? 3 : 2,
    o: 0.25 + ((i * 7) % 10) / 20,
  }));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B0B0C",
          color: "#EDEDED",
          position: "relative",
        }}
      >
        {stars.map((s, i) => (
          <div
            key={i}
            style={{ position: "absolute", left: s.x, top: s.y, width: s.s, height: s.s, borderRadius: 99, background: "#fff", opacity: s.o }}
          />
        ))}
        <img src={mark} width={360} height={200} alt="" />
        <div style={{ marginTop: 36, fontSize: 64, letterSpacing: 22, fontFamily: "serif" }}>MAJESTO</div>
        <div
          style={{
            marginTop: 44,
            padding: "18px 40px",
            background: "#EDEDED",
            color: "#141414",
            fontSize: 24,
            letterSpacing: 5,
          }}
        >
          TERMIN BUCHEN
        </div>
      </div>
    ),
    size,
  );
}
