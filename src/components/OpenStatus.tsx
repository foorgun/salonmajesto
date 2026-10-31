"use client";

import { useSyncExternalStore } from "react";
import { openStatus } from "@/lib/hours";

const subscribe = (cb: () => void) => {
  const id = setInterval(cb, 60_000);
  return () => clearInterval(id);
};
const snapshot = () => JSON.stringify(openStatus());
const serverSnapshot = () => "";

/** Live-Status aus den Öffnungszeiten; rendert erst im Browser (keine Hydration-Abweichung). */
export function OpenStatus({ className = "" }: { className?: string }) {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const status = raw ? (JSON.parse(raw) as ReturnType<typeof openStatus>) : null;
  return (
    <p className={`label flex min-h-4 items-center gap-2 ${className}`} aria-live="polite">
      {status && (
        <>
          {status.open && <span className="size-1.5 rounded-full bg-open" aria-hidden />}
          {status.text}
        </>
      )}
    </p>
  );
}
