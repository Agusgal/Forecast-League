import { NextResponse } from "next/server";
import { workspaceActionSchema } from "@/domain/workspace";
import { body, endpoint } from "@/server/http";
import { DEMO_COOKIE, localStore } from "@/server/local-store";
import { hasSupabase, SupabaseAdapter } from "@/server/supabase";

export const runtime = "nodejs";

export const GET = endpoint(async (request) => {
  if (hasSupabase()) {
    const adapter = new SupabaseAdapter(request);
    return adapter.respond(await adapter.workspace());
  }
  return NextResponse.json(
    await localStore.workspace(request.cookies.get(DEMO_COOKIE)?.value),
  );
});

export const POST = endpoint(async (request) => {
  const input = await body(request, workspaceActionSchema);
  if (hasSupabase()) {
    const adapter = new SupabaseAdapter(request);
    return adapter.respond(await adapter.workspaceAction(input));
  }
  return NextResponse.json(
    await localStore.workspaceAction(request.cookies.get(DEMO_COOKIE)?.value, input),
  );
});
