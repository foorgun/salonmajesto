import { NextResponse } from "next/server";
import { isAuthConfigured, supabaseAuthClient } from "@/lib/auth";

/** Ziel des Magic Links: Code gegen Session tauschen, dann zum Admin. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code && isAuthConfigured) {
    const supabase = await supabaseAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/admin?msg=Login-Link+ungültig+oder+abgelaufen", url.origin));
  }
  return NextResponse.redirect(new URL("/admin", url.origin));
}
