import { NextResponse } from "next/server";
import { endpoint } from "@/server/http";
import { hasSupabase, SupabaseAdapter } from "@/server/supabase";
export const GET = endpoint(async (request) => {
  const origin = `${request.nextUrl.protocol}//${request.headers.get("host") || request.nextUrl.host}`;
  if (!hasSupabase())
    return NextResponse.redirect(new URL("/login?error=confirmation", origin));
  const adapter = new SupabaseAdapter(request);
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const result = code
    ? await adapter.client.auth.exchangeCodeForSession(code)
    : tokenHash && type === "email"
      ? await adapter.client.auth.verifyOtp({
          token_hash: tokenHash,
          type: "email",
        })
      : null;
  return NextResponse.redirect(
    new URL(
      result && !result.error ? "/forecasts" : "/login?error=confirmation",
      origin,
    ),
  );
});
