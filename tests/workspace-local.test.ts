import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { LocalStore, type LocalData } from "../src/server/local-store";
import type { Plan, WorkspaceAction } from "../src/domain/workspace";
import type { QuestionDraft } from "../src/domain/schemas";

const start = "2026-10-14T02:59:00Z";
const draft = (title = "¿Lloverá en Córdoba durante el próximo mes?"): QuestionDraft => ({
  title, description: "Pregunta de prueba con una condición objetiva de resolución.", category: "Climate", horizon: "monthly",
  opensAt: "2026-10-13T00:00:00Z", closesAt: "2026-11-13T00:00:00Z", resolvesAt: "2026-11-14T00:00:00Z",
  resolutionCriteria: "Se resolverá según la medición publicada en la fuente oficial.", sourceName: "SMN", sourceUrl: "https://www.smn.gob.ar", visual: "climate",
});

async function fixture(run: (f: {
  store: LocalStore; filename: string; setTime: (time: string) => void;
  account: (username: string) => ReturnType<LocalStore["createAccount"]>;
  admin: Awaited<ReturnType<LocalStore["createAccount"]>>;
  setPlan: (userId: string, plan: Plan) => Promise<void>;
}) => Promise<void>) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "forecast-workspace-"));
  const filename = path.join(directory, "db.json");
  let now = new Date(start);
  const store = new LocalStore(filename, () => now);
  const account = (username: string) => store.createAccount({
    username, email: `${username}@example.test`, password: "test-workspace-password",
    personalData: { birthCountry: "AR", residenceCountry: "AR", age: 32, sex: "undisclosed", city: "Private City", annualIncome: 12345, incomeCurrency: "ARS" },
  });
  try {
    const admin = await account("admin");
    const data: LocalData = JSON.parse(await readFile(filename, "utf8"));
    data.profiles.find((profile) => profile.id === admin.profile.id)!.isAdmin = true;
    await writeFile(filename, JSON.stringify(data));
    await run({ store, filename, account, admin, setTime: (time) => { now = new Date(time); }, setPlan: async (userId, plan) => { await store.workspaceAction(admin.token, { action: "set_plan", userId, plan }); } });
  } finally { await rm(directory, { recursive: true, force: true }); }
}

const rejectsStatus = async (action: Promise<unknown>, status: number) => assert.rejects(action, (error: unknown) => Boolean(error && typeof error === "object" && "status" in error && error.status === status));

test("local workspace protects plans, legacy guest conversion and registered administrator access", async () => {
  await fixture(async ({ store, filename, account, admin, setPlan }) => {
    const guest = await store.ensureSession();
    const ordinary = await account("ordinary");
    assert.equal(guest.profile.isAdmin, false);
    assert.equal(ordinary.profile.isAdmin, false);
    assert.equal((await store.currentProfile(admin.token))?.isAdmin, true);
    for (const token of [undefined, "invalid", guest.token]) {
      const state = await store.workspace(token);
      assert.equal(state.registered, false);
      assert.equal(state.plan, "free");
      assert.deepEqual(state.accounts, []);
      assert.deepEqual(state.communities, []);
      await rejectsStatus(store.workspaceAction(token, { action: "propose", question: draft() }), token === guest.token ? 403 : 401);
    }
    await rejectsStatus(store.workspaceAction(ordinary.token, { action: "set_plan", userId: ordinary.profile.id, plan: "enterprise" }), 403);
    await rejectsStatus(store.workspaceAction(admin.token, { action: "set_plan", userId: guest.profile.id, plan: "enterprise" }), 404);
    const stored: LocalData = JSON.parse(await readFile(filename, "utf8"));
    stored.profiles.find((row) => row.id === guest.profile.id)!.isAdmin = true;
    stored.questions.push({ ...draft(), id: "private-draft", status: "DRAFT", outcome: null, isDemo: true });
    await writeFile(filename, JSON.stringify(stored));
    assert.equal((await store.ensureSession(guest.token)).profile.isAdmin, false);
    assert.equal((await store.currentProfile(guest.token))?.isAdmin, false);
    assert.equal((await store.bootstrap(guest.token)).questions.some((row) => row.id === "private-draft"), false);
    assert.equal((await store.bootstrap(admin.token)).questions.some((row) => row.id === "private-draft"), true);
    await rejectsStatus(store.participation(guest.token), 403);
    await rejectsStatus(store.adminQuestion(guest.token, { action: "close", questionId: "private-draft" }), 403);
    await rejectsStatus(store.workspaceAction(guest.token, { action: "set_plan", userId: ordinary.profile.id, plan: "enterprise" }), 403);
    const converted = await store.createAccount({ username: "converted", email: "converted@example.test", password: "test-password", personalData: { birthCountry: "AR", residenceCountry: "AR", age: 25, sex: "other" } }, guest.token);
    assert.equal(converted.profile.isAdmin, false);
    await setPlan(ordinary.profile.id, "enterprise");
    const enterprise = await store.workspace(ordinary.token);
    assert.equal(enterprise.plan, "enterprise");
    assert.equal(enterprise.analytics?.registeredUsers, 3);
    assert.equal(enterprise.analytics?.meanBrier, null);
    assert.equal(enterprise.analytics?.suppressed, true);
    assert.deepEqual(enterprise.accounts, []);
    const adminView = await store.workspace(admin.token);
    assert.equal(adminView.accounts.length, 3);
    for (const view of [adminView, enterprise]) for (const secret of ["email", "passwordHash", "personalData", "annualIncome", "Private City", "revisions"]) assert.equal(JSON.stringify(view).includes(secret), false);
  });
});

test("proposal quota is atomic across stores, counts rejection, resets at Argentina midnight and never grants more through plan changes", async () => {
  await fixture(async ({ store, filename, account, admin, setTime, setPlan }) => {
    const user = await account("freeuser");
    const otherStore = new LocalStore(filename, () => new Date(start));
    const results = await Promise.allSettled(Array.from({ length: 8 }, (_, index) => (index % 2 ? store : otherStore).workspaceAction(user.token, { action: "propose", question: draft() })));
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(results.filter((result) => result.status === "rejected" && result.reason.status === 429).length, 7);
    let state = await store.workspace(user.token);
    assert.equal(state.quota.used, 1);
    assert.equal(state.quota.remaining, 0);
    assert.equal(state.quota.resetsAt, "2026-10-14T03:00:00.000Z");
    const proposal = state.proposals[0];
    assert.equal(proposal.status, "pending");
    assert.equal((await store.bootstrap(user.token)).questions.some((row) => row.title === draft().title), false);
    await store.workspaceAction(admin.token, { action: "review", proposalId: proposal.id, decision: "reject", note: "Falta una fuente verificable." });
    await rejectsStatus(store.workspaceAction(user.token, { action: "propose", question: draft() }), 429);
    await setPlan(user.profile.id, "pro");
    const proResults = await Promise.allSettled(Array.from({ length: 12 }, () => store.workspaceAction(user.token, { action: "propose", question: draft() })));
    assert.equal(proResults.filter((result) => result.status === "fulfilled").length, 9);
    state = await store.workspace(user.token);
    assert.equal(state.quota.used, 10);
    await setPlan(user.profile.id, "free");
    assert.equal((await store.workspace(user.token)).quota.remaining, 0);
    await setPlan(user.profile.id, "pro");
    await rejectsStatus(store.workspaceAction(user.token, { action: "propose", question: draft() }), 429);
    setTime("2026-10-14T03:00:00Z");
    state = await store.workspace(user.token);
    assert.equal(state.quota.used, 0);
    assert.equal(state.quota.resetsAt, "2026-10-15T03:00:00.000Z");
    await store.workspaceAction(user.token, { action: "propose", question: draft() });
    assert.equal((await store.workspace(user.token)).quota.used, 1);
  });
});

test("moderation is private, priority FIFO is snapshotted, approval publishes once and expired drafts cannot be approved", async () => {
  await fixture(async ({ store, account, admin, setTime, setPlan }) => {
    const free = await account("normal");
    const pro = await account("priority");
    await setPlan(pro.profile.id, "pro");
    const normal = (await store.workspaceAction(free.token, { action: "propose", question: draft("¿Se publicará el próximo informe mensual del SMN?") })).proposals[0];
    setTime("2026-10-14T03:01:00Z");
    const first = (await store.workspaceAction(pro.token, { action: "propose", question: draft() })).proposals[0];
    setTime("2026-10-14T03:02:00Z");
    const second = (await store.workspaceAction(pro.token, { action: "propose", question: draft() })).proposals[0];
    await setPlan(pro.profile.id, "free");
    assert.deepEqual((await store.workspace(admin.token)).reviewQueue.map((row) => row.id), [first.id, second.id, normal.id]);
    assert.deepEqual((await store.workspace(free.token)).reviewQueue, []);
    assert.equal((await store.workspace(free.token)).proposals.length, 1);
    await rejectsStatus(store.workspaceAction(free.token, { action: "review", proposalId: first.id, decision: "approve", note: "Verificado con la fuente." }), 403);
    await store.workspaceAction(admin.token, { action: "review", proposalId: first.id, decision: "approve", note: "Verificado con la fuente." });
    const reviewed = (await store.workspace(pro.token)).proposals.find((row) => row.id === first.id)!;
    assert.equal(reviewed.status, "approved");
    assert.equal(reviewed.reviewNote, "Verificado con la fuente.");
    const published = (await store.bootstrap(pro.token)).questions.find((row) => row.id === reviewed.publishedQuestionId)!;
    assert.equal(published.status, "PUBLISHED");
    assert.equal(published.isDemo, true);
    assert.equal(published.outcome, null);
    for (const decision of ["approve", "reject"] as const) await rejectsStatus(store.workspaceAction(admin.token, { action: "review", proposalId: first.id, decision, note: "Segundo intento inválido." }), 409);
    setTime("2026-11-13T00:00:00Z");
    // Session lasts thirty days; renew sign-in to test an expired proposal independently.
    const freshAdmin = await store.signIn({ email: "admin@example.test", password: "test-workspace-password" });
    await rejectsStatus(store.workspaceAction(freshAdmin.token, { action: "review", proposalId: second.id, decision: "approve", note: "La propuesta ya venció." }), 409);
    await store.workspaceAction(freshAdmin.token, { action: "review", proposalId: second.id, decision: "reject", note: "La propuesta ya venció." });
    await rejectsStatus(store.workspaceAction(freshAdmin.token, { action: "propose", question: draft() }), 409);
  });
});

test("communities are isolated from leagues, curator access depends on the owner plan, and revocation preserves read access", async () => {
  await fixture(async ({ store, account, admin, setPlan }) => {
    const owner = await account("communityowner");
    const member = await account("member");
    const outsider = await account("outsider");
    await rejectsStatus(store.workspaceAction(owner.token, { action: "create_community", name: "Argentina", description: "Pronósticos sobre temas argentinos." }), 403);
    await setPlan(owner.profile.id, "community");
    const community = (await store.workspaceAction(owner.token, { action: "create_community", name: "Argentina", description: "Pronósticos sobre temas argentinos." })).communities[0];
    assert.equal((await store.bootstrap(owner.token)).leagues.length, 0);
    assert.deepEqual((await store.workspace(outsider.token)).communities, []);
    await store.workspaceAction(member.token, { action: "join_community", code: community.code.toLowerCase() });
    await store.workspaceAction(member.token, { action: "join_community", code: community.code });
    assert.equal((await store.workspace(member.token)).communities[0].members.length, 2);
    assert.equal((await store.workspace(member.token)).communities[0].analytics, null);
    await rejectsStatus(store.workspaceAction(member.token, { action: "propose", question: draft(), communityId: community.id }), 403);
    await rejectsStatus(store.workspaceAction(outsider.token, { action: "propose", question: draft(), communityId: community.id }), 404);
    await rejectsStatus(store.workspaceAction(owner.token, { action: "set_curator", communityId: community.id, userId: member.profile.id, enabled: true }), 403);
    await setPlan(owner.profile.id, "enterprise");
    await store.workspaceAction(owner.token, { action: "set_curator", communityId: community.id, userId: member.profile.id, enabled: true });
    await rejectsStatus(store.workspaceAction(owner.token, { action: "set_curator", communityId: community.id, userId: outsider.profile.id, enabled: true }), 400);
    const proposed = (await store.workspaceAction(member.token, { action: "propose", question: draft(), communityId: community.id })).proposals[0];
    assert.equal(proposed.plan, "free");
    assert.equal(proposed.priority, "normal");
    assert.deepEqual((await store.workspace(owner.token)).communities[0].questionIds, []);
    await store.workspaceAction(admin.token, { action: "review", proposalId: proposed.id, decision: "approve", note: "Criterios completos y fuente válida." });
    assert.equal((await store.workspace(owner.token)).communities[0].questionIds.length, 1);
    await setPlan(owner.profile.id, "community");
    await rejectsStatus(store.workspaceAction(member.token, { action: "propose", question: draft(), communityId: community.id }), 403);
    await setPlan(owner.profile.id, "free");
    const downgraded = await store.workspace(owner.token);
    assert.equal(downgraded.communities.length, 1);
    assert.equal(downgraded.communities[0].analytics, null);
    assert.equal(downgraded.analytics, null);
    await rejectsStatus(store.workspaceAction(owner.token, { action: "propose", question: draft(), communityId: community.id }), 403);
    await rejectsStatus(store.workspaceAction(owner.token, { action: "set_curator", communityId: community.id, userId: member.profile.id, enabled: false }), 403);
  });
});

test("survey participation requires explicit consent, results suppress under five and withdrawal removes choices permanently even after closure", async () => {
  await fixture(async ({ store, filename, account, setPlan, setTime }) => {
    const owner = await account("surveyowner");
    const users = await Promise.all(Array.from({ length: 5 }, (_, index) => account(`respondent${index}`)));
    const outsider = await account("surveyoutsider");
    await setPlan(owner.profile.id, "enterprise");
    const community = (await store.workspaceAction(owner.token, { action: "create_community", name: "Investigación", description: "Encuestas consentidas para la comunidad." })).communities[0];
    for (const user of users) await store.workspaceAction(user.token, { action: "join_community", code: community.code });
    const surveyInput = { action: "create_survey" as const, communityId: community.id, title: "¿Qué temas te interesan más?", purpose: "Elegir próximos temas de preguntas mediante respuestas voluntarias agregadas.", options: ["Clima", "Economía"], closesAt: "2026-10-15T00:00:00Z" };
    await assert.rejects(store.workspaceAction(owner.token, { ...surveyInput, options: ["Clima", "clima"] }));
    const survey = (await store.workspaceAction(owner.token, surveyInput)).surveys[0];
    assert.equal(survey.acceptingResponses, true);
    assert.deepEqual((await store.workspace(outsider.token)).surveys, []);
    await rejectsStatus(store.workspaceAction(outsider.token, { action: "answer_survey", surveyId: survey.id, optionIndex: 0, consent: true }), 404);
    for (const consent of [undefined, false]) await assert.rejects(store.workspaceAction(users[0].token, { action: "answer_survey", surveyId: survey.id, optionIndex: 0, consent } as unknown as WorkspaceAction));
    await rejectsStatus(store.workspaceAction(users[0].token, { action: "answer_survey", surveyId: survey.id, optionIndex: 5, consent: true }), 400);
    for (const user of users.slice(0, 4)) await store.workspaceAction(user.token, { action: "answer_survey", surveyId: survey.id, optionIndex: 0, consent: true });
    assert.deepEqual((await store.workspace(owner.token)).surveys[0].results, { responses: 4, counts: null, suppressed: true });
    const fifth = await store.workspaceAction(users[4].token, { action: "answer_survey", surveyId: survey.id, optionIndex: 1, consent: true });
    assert.equal(fifth.surveys[0].ownOptionIndex, 1);
    assert.equal(fifth.surveys[0].acceptingResponses, false);
    assert.equal(fifth.surveys[0].results, null);
    const ownerState = await store.workspace(owner.token);
    assert.deepEqual(ownerState.surveys[0].results, { responses: 5, counts: [4, 1], suppressed: false });
    assert.equal(JSON.stringify(ownerState.surveys).includes(users[0].profile.id), false);
    assert.equal(JSON.stringify(ownerState.surveys).includes("consentedAt"), false);
    await rejectsStatus(store.workspaceAction(users[0].token, { action: "answer_survey", surveyId: survey.id, optionIndex: 1, consent: true }), 409);
    await store.workspaceAction(users[0].token, { action: "withdraw_survey", surveyId: survey.id });
    await rejectsStatus(store.workspaceAction(users[0].token, { action: "answer_survey", surveyId: survey.id, optionIndex: 1, consent: true }), 409);
    assert.deepEqual((await store.workspace(owner.token)).surveys[0].results, { responses: 4, counts: null, suppressed: true });
    setTime("2026-10-15T00:00:00Z");
    await rejectsStatus(store.workspaceAction(owner.token, { action: "answer_survey", surveyId: survey.id, optionIndex: 0, consent: true }), 409);
    await setPlan(owner.profile.id, "free");
    assert.equal((await store.workspace(owner.token)).surveys[0].results, null);
    await store.workspaceAction(users[4].token, { action: "withdraw_survey", surveyId: survey.id });
    const withdrawn = (await store.workspaceAction(users[4].token, { action: "withdraw_survey", surveyId: survey.id })).surveys[0];
    assert.equal(withdrawn.answered, true);
    assert.equal(withdrawn.ownOptionIndex, null);
    assert.equal(withdrawn.acceptingResponses, false);
    const data: LocalData = JSON.parse(await readFile(filename, "utf8"));
    data.workspace!.communities[0].members = data.workspace!.communities[0].members.filter((row) => row.userId !== users[1].profile.id);
    await writeFile(filename, JSON.stringify(data));
    const formerMember = await store.workspaceAction(users[1].token, { action: "withdraw_survey", surveyId: survey.id });
    assert.deepEqual(formerMember.surveys, []);
    const after: LocalData = JSON.parse(await readFile(filename, "utf8"));
    const erased = after.workspace!.surveys[0].responses.find((row) => row.userId === users[1].profile.id)!;
    assert.equal(erased.optionIndex, null);
    assert.equal(erased.consentedAt, null);
    assert.ok(erased.withdrawnAt);
  });
});

test("community accuracy uses approved linked questions and requires five resolved registered participants per category", async () => {
  await fixture(async ({ store, filename, account, admin, setPlan }) => {
    const owner = await account("analyticsowner");
    const participants = await Promise.all(Array.from({ length: 5 }, (_, index) => account(`participant${index}`)));
    await setPlan(owner.profile.id, "enterprise");
    const community = (await store.workspaceAction(owner.token, { action: "create_community", name: "Analítica", description: "Preguntas compartidas de la comunidad." })).communities[0];
    for (const user of participants) await store.workspaceAction(user.token, { action: "join_community", code: community.code });
    const first = (await store.workspaceAction(owner.token, { action: "propose", question: draft(), communityId: community.id })).proposals[0];
    await store.workspaceAction(admin.token, { action: "review", proposalId: first.id, decision: "approve", note: "Fuente y criterios confirmados." });
    const questionId = (await store.workspace(owner.token)).communities[0].questionIds[0];
    for (const user of participants.slice(0, 4)) await store.submitForecast(user.token, { questionId, probability: 0.8, reasoning: "Privado" });
    let state = await store.workspace(owner.token);
    assert.equal(state.communities[0].analytics?.forecasts, 4);
    assert.equal(state.communities[0].analytics?.meanBrier, null);
    assert.equal(state.communities[0].analytics?.resolvedForecasts, 0);
    await store.adminQuestion(admin.token, { action: "close", questionId });
    await store.adminQuestion(admin.token, { action: "resolve", questionId, outcome: 1 });
    state = await store.workspace(owner.token);
    assert.equal(state.communities[0].analytics?.meanBrier, null);
    assert.deepEqual(state.communities[0].analytics?.byCategory, []);
    // Add the fifth historical valid forecast directly in the isolated fixture.
    const data: LocalData = JSON.parse(await readFile(filename, "utf8"));
    data.revisions.push({ ...data.revisions.find((row) => row.questionId === questionId)!, id: "fifth-valid-revision", forecastId: "fifth-forecast", userId: participants[4].profile.id });
    const economy = { ...data.questions.find((row) => row.id === questionId)!, id: "small-economy-cohort", category: "Economy" as const };
    data.questions.push(economy);
    data.workspace!.proposals.push({ ...data.workspace!.proposals[0], id: "economy-proposal", question: { ...draft(), category: "Economy" }, status: "approved", publishedQuestionId: economy.id });
    data.revisions.push({ ...data.revisions.find((row) => row.questionId === questionId)!, id: "economy-revision", forecastId: "economy-forecast", questionId: economy.id });
    await writeFile(filename, JSON.stringify(data));
    state = await store.workspace(owner.token);
    const analytic = state.communities[0].analytics!;
    assert.equal(analytic.suppressed, false);
    assert.equal(analytic.participants, 5);
    assert.equal(analytic.resolvedForecasts, 6);
    assert.ok(Math.abs(analytic.meanBrier! - 0.04) < 1e-12);
    assert.deepEqual(analytic.byCategory.map((row) => row.category), ["Climate"]);
    assert.equal(state.analytics?.suppressed, false);
    assert.equal(state.analytics?.participants, 5, "seeded demo personas are not registered analytic subjects");
    assert.equal(JSON.stringify(analytic).includes("Privado"), false);
    assert.equal((await store.workspace(participants[0].token)).communities[0].analytics, null);
  });
});
