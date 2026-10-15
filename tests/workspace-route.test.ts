import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { NextRequest } from "next/server";
import { quotaDay, quotaReset, workspaceActionSchema } from "../src/domain/workspace";

test("quota days reset at Argentina midnight and workspace contracts reject forged fields", () => {
  const before = new Date("2026-10-14T02:59:59Z");
  const after = new Date("2026-10-14T03:00:00Z");
  assert.equal(quotaDay(before), "2026-10-13");
  assert.equal(quotaReset(before), "2026-10-14T03:00:00.000Z");
  assert.equal(quotaDay(after), "2026-10-14");
  assert.equal(quotaReset(after), "2026-10-15T03:00:00.000Z");
  assert.equal(workspaceActionSchema.safeParse({ action: "set_plan", userId: "me", plan: "enterprise", isAdmin: true }).success, false);
  assert.equal(workspaceActionSchema.safeParse({ action: "answer_survey", surveyId: "example", optionIndex: 0, consent: false }).success, false);
  assert.equal(workspaceActionSchema.safeParse({ action: "create_survey", communityId: "example", title: "Una encuesta de prueba", purpose: "Conocer las preferencias de la comunidad.", options: ["Sí", "sí"], closesAt: "2027-01-01T00:00:00Z" }).success, false);
});

test("workspace HTTP boundary protects plan assignments, quotas, moderation and personal data", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "forecast-workspace-api-"));
  const filename = path.join(directory, "data.json");
  const oldFile = process.env.FORECAST_DATA_PATH;
  process.env.FORECAST_DATA_PATH = filename;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  try {
    const workspace = await import("../src/app/api/workspace/route");
    const auth = await import("../src/app/api/auth/route");
    const bootstrap = await import("../src/app/api/bootstrap/route");
    const req = (route: string, payload?: unknown, cookie = "", origin = "http://localhost:3000") => new NextRequest(`http://localhost:3000/api/${route}`, {
      method: payload ? "POST" : "GET",
      headers: { cookie, origin, "content-type": "application/json" },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });
    const guestResponse = await bootstrap.GET(req("bootstrap"));
    const guestCookie = guestResponse.headers.get("set-cookie")!.split(";")[0];
    const guest = await (await workspace.GET(req("workspace", undefined, guestCookie))).json();
    assert.equal(guest.registered, false);
    assert.equal(guest.plan, "free");
    assert.deepEqual(guest.reviewQueue, []);
    const signup = await auth.POST(req("auth", {
      action: "signup", username: "Workspace fixture", email: "workspace-api@example.test", password: "fixture-password-only",
      personalData: { birthCountry: "AR", residenceCountry: "AR", age: 32, sex: "undisclosed", city: "Hidden fixture town" },
    }, guestCookie));
    assert.equal(signup.status, 200);
    const user = (await signup.json()).user;
    assert.equal(user.isAdmin, false);
    const cookie = signup.headers.get("set-cookie")!.split(";")[0];
    const now = Date.now();
    const question = {
      title: "¿Ocurrirá este evento de prueba mañana?", description: "Una pregunta de prueba con contexto y un resultado binario.",
      category: "Climate", horizon: "daily", opensAt: new Date(now - 1000).toISOString(), closesAt: new Date(now + 86400_000).toISOString(), resolvesAt: new Date(now + 172800_000).toISOString(),
      resolutionCriteria: "Se resolverá con sí si la fuente confirma el evento dentro del plazo.", sourceName: "Fuente de prueba", sourceUrl: "https://example.test/result", visual: "climate",
    };
    assert.equal((await workspace.POST(req("workspace", { action: "propose", question }, guestCookie))).status, 401);
    assert.equal((await workspace.POST(req("workspace", { action: "set_plan", userId: user.id, plan: "enterprise" }, cookie))).status, 403);
    assert.equal((await workspace.POST(req("workspace", { action: "propose", question }, cookie, "https://external.example"))).status, 403);
    assert.equal((await workspace.POST(req("workspace", { action: "propose", question, priority: "priority" }, cookie))).status, 400);
    const submitted = await workspace.POST(req("workspace", { action: "propose", question }, cookie));
    assert.equal(submitted.status, 200);
    const state = await submitted.json();
    assert.equal(state.proposals.length, 1);
    assert.equal(state.proposals[0].status, "pending");
    assert.equal(state.quota.remaining, 0);
    assert.equal(state.proposals[0].priority, "normal");
    assert.equal((await workspace.POST(req("workspace", { action: "propose", question }, cookie))).status, 429);
    const before = await (await bootstrap.GET(req("bootstrap", undefined, cookie))).json();
    assert.equal(before.questions.some((row: { title: string }) => row.title === question.title), false);
    const review = { action: "review", proposalId: state.proposals[0].id, decision: "approve", note: "Fuente y criterios revisados." };
    assert.equal((await workspace.POST(req("workspace", review, cookie))).status, 403);
    // Only this isolated test fixture grants administrator rights, never a public endpoint.
    const stored = JSON.parse(await readFile(filename, "utf8"));
    stored.profiles.find((row: { id: string }) => row.id === user.id).isAdmin = true;
    await writeFile(filename, JSON.stringify(stored));
    const approved = await workspace.POST(req("workspace", review, cookie));
    assert.equal(approved.status, 200);
    const finalState = await approved.json();
    assert.equal(finalState.proposals[0].status, "approved");
    assert.equal(finalState.reviewQueue.length, 0);
    assert.equal((await workspace.POST(req("workspace", review, cookie))).status, 409);
    const published = await (await bootstrap.GET(req("bootstrap", undefined, cookie))).json();
    assert.equal(published.questions.filter((row: { title: string }) => row.title === question.title).length, 1);
    const enterprise = await workspace.POST(req("workspace", { action: "set_plan", userId: user.id, plan: "enterprise" }, cookie));
    assert.equal(enterprise.status, 200);
    const enterpriseState = await enterprise.json();
    assert.equal(enterpriseState.plan, "enterprise");
    assert.equal(enterpriseState.quota.remaining, 9);
    assert.equal(enterpriseState.analytics.meanBrier, null);
    for (const secret of ["Hidden fixture town", "workspace-api@example.test", "passwordHash", "birthCountry", "annualIncome"]) assert.equal(JSON.stringify(enterpriseState).includes(secret), false);
    assert.match(enterprise.headers.get("cache-control")!, /no-store/);
  } finally {
    await rm(directory, { recursive: true, force: true });
    if (oldFile === undefined) delete process.env.FORECAST_DATA_PATH; else process.env.FORECAST_DATA_PATH = oldFile;
  }
});
