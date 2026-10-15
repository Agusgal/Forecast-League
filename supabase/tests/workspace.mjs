import assert from "node:assert/strict";

// Direct RPC calls intentionally bypass the HTTP/Zod layer. The database is the
// authorization boundary when a Supabase client calls PostgREST itself.
export async function verifyWorkspace(db, { actor, result, rejects, a, b, admin, newcomer, tieA, tieB }) {
  const read = () => result("select public.get_workspace() as result");
  const action = (input) => result("select public.workspace_action($1::jsonb) as result", [JSON.stringify(input)]);
  const denied = (input, message) => rejects("select public.workspace_action($1::jsonb)", [JSON.stringify(input)], message);
  const question = (title = "¿Se verificará este pronóstico de prueba?") => ({
    title, description: "Pregunta de prueba con criterio verificable e independiente.",
    category: "Economy", horizon: "daily", opensAt: new Date(Date.now() - 3600000).toISOString(),
    closesAt: new Date(Date.now() + 86400000).toISOString(), resolvesAt: new Date(Date.now() + 172800000).toISOString(),
    resolutionCriteria: "Se resuelve Sí solamente si se verifica la condición establecida.",
    sourceName: "Fuente de prueba", sourceUrl: "https://example.com/evidence", visual: "economy",
  });
  const setPlan = async (userId, plan) => {
    await actor(admin);
    return action({ action: "set_plan", userId, plan });
  };
  await actor(null, "anon");
  const anonymous = await read();
  assert.equal(anonymous.registered, false);
  assert.equal(anonymous.plan, "free");
  assert.equal(anonymous.quota.limit, 1);
  assert.deepEqual(anonymous.proposals, []);
  assert.equal(anonymous.analytics, null);
  await denied({ action: "propose", question: question() }, /permission denied/);
  await actor(a);
  assert.equal((await read()).plan, "free");
  for (const table of ["user_plans", "communities", "community_members", "question_proposals", "community_surveys", "survey_responses"]) {
    await rejects(`select * from public.${table}`, [], /permission denied/);
    await rejects(`insert into public.${table} default values`, [], /permission denied/);
    await rejects(`delete from public.${table}`, [], /permission denied/);
  }
  await rejects("select public.workspace_analytics(null)", [], /permission denied/);
  await denied({ action: "set_plan", userId: a, plan: "enterprise" }, /Administrator/);
  await denied({ action: "create_community", name: "Nueva comunidad", description: "Descripción privada y suficiente" }, /Community plan/);
  await db.exec("reset role");
  const createdAfterMigration = (await db.query(`insert into auth.users(id,email,raw_user_meta_data)
    values(gen_random_uuid(),'new-plan-test@example.test',
    '{"plan":"enterprise","personal_data":{"birthCountry":"AR","residenceCountry":"AR","age":30,"sex":"undisclosed"}}') returning id`)).rows[0].id;
  assert.equal((await db.query("select plan from public.user_plans where user_id=$1", [createdAfterMigration])).rows[0].plan, "free");
  await actor(a);
  console.log("PASS workspace default Free, anonymous projection, private tables and protected plans");

  for (const invalid of [
    {}, { action: "unknown" }, { action: "propose", question: question(), plan: "enterprise" },
    { action: "propose", question: { ...question(), status: "PUBLISHED" } },
    { action: "propose", question: { ...question(), title: 1234567890123 } },
    { action: "propose", question: { ...question(), title: "tiny" } },
    { action: "propose", question: { ...question(), description: null } },
    { action: "propose", question: { ...question(), sourceUrl: "javascript:alert(1)" } },
    { action: "propose", question: { ...question(), category: "Other" } },
    { action: "propose", question: { ...question(), opensAt: "infinity" } },
    { action: "propose", question: { ...question(), opensAt: "2026-10-14T12:00:00" } },
    { action: "propose", question: { ...question(), closesAt: new Date(Date.now() - 1000).toISOString() } },
  ]) await denied(invalid);
  assert.equal((await read()).quota.used, 0);
  let state = await action({ action: "propose", question: question() });
  const first = state.proposals[0];
  assert.equal(first.status, "pending");
  assert.equal(first.plan, "free");
  assert.equal(first.priority, "normal");
  assert.equal(state.quota.used, 1);
  assert.equal(state.quota.remaining, 0);
  const reset = new Date(state.quota.resetsAt);
  assert.equal(reset.getUTCHours(), 3);
  assert.equal(state.quota.timeZone, "America/Argentina/Buenos_Aires");
  await denied({ action: "propose", question: question() }, /quota/);
  await actor(b);
  assert.deepEqual((await read()).proposals, []);
  assert.deepEqual((await read()).reviewQueue, []);
  await denied({ action: "review", proposalId: first.id, decision: "approve", note: "Aprobar sin permiso" }, /Administrator/);
  await actor(admin);
  await denied({ action: "review", proposalId: first.id, decision: "approve", note: "no" });
  await action({ action: "review", proposalId: first.id, decision: "reject", note: "Debe especificar mejor el criterio de resolución" });
  await actor(a);
  assert.equal((await read()).quota.used, 1);
  await denied({ action: "propose", question: question() }, /quota/);
  await setPlan(a, "pro");
  await actor(a);
  assert.equal((await read()).quota.remaining, 9);
  for (let i = 0; i < 9; i++) state = await action({ action: "propose", question: question(`¿Se verificará el pronóstico prioritario número ${i}?`) });
  assert.equal(state.quota.used, 10);
  assert.equal(state.proposals.find(p => p.id === first.id).plan, "free");
  await denied({ action: "propose", question: question() }, /quota/);
  await actor(admin);
  const adminState = await action({ action: "propose", question: question("¿Debe revisarse también la pregunta del administrador?") });
  assert.equal(adminState.proposals[0].status, "pending");
  assert.equal(adminState.proposals[0].priority, "normal");
  const queue = adminState.reviewQueue;
  assert.ok(queue.slice(0, 9).every(p => p.priority === "priority"));
  assert.equal(queue.at(-1).priority, "normal");
  assert.ok(queue.slice(0, 9).every((p, i, rows) => i === 0 || Date.parse(rows[i - 1].submittedAt) <= Date.parse(p.submittedAt)));
  const approval = queue[0];
  await action({ action: "review", proposalId: approval.id, decision: "approve", note: "Fuente y plazos comprobados, publicación autorizada" });
  await denied({ action: "review", proposalId: approval.id, decision: "approve", note: "No se puede publicar dos veces" }, /already reviewed/);
  await actor(a);
  const published = (await read()).proposals.find(p => p.id === approval.id);
  const row = (await db.query("select * from public.questions where id=$1", [published.publishedQuestionId])).rows[0];
  assert.equal(row.status, "PUBLISHED");
  assert.equal(row.is_demo, false);
  assert.equal(row.resolution_criteria, approval.question.resolutionCriteria);
  await actor(admin);
  await rejects("update public.questions set resolution_criteria='Changed published resolution terms' where id=$1", [row.id], /cannot change/);
  // Expired approval leaves the proposal pending and creates no draft orphan.
  await db.exec("reset role");
  const expiringId = queue[1].id;
  await db.query("update public.question_proposals set question=jsonb_set(question,'{closesAt}',$2::jsonb) where id=$1", [expiringId, JSON.stringify(new Date(Date.now() - 60000).toISOString())]);
  const before = (await db.query("select count(*)::integer n from public.questions")).rows[0].n;
  await actor(admin);
  await denied({ action: "review", proposalId: expiringId, decision: "approve", note: "Los plazos ya vencieron" }, /deadline/);
  assert.equal((await db.query("select count(*)::integer n from public.questions")).rows[0].n, before);
  assert.equal((await read()).reviewQueue.find(p => p.id === expiringId).status, "pending");
  console.log("PASS strict direct-RPC validation, Argentine daily quota, immutable priority and atomic manual review");

  await setPlan(a, "enterprise");
  await actor(a);
  assert.equal((await read()).quota.used, 10);
  state = await action({ action: "create_community", name: "Comunidad de prueba", description: "Comunidad privada para probar permisos y estadísticas." });
  const community = state.communities[0];
  assert.equal(community.members[0].role, "owner");
  await actor(admin);
  assert.deepEqual((await read()).communities, []);
  assert.equal((await read()).analytics, null);
  await actor(b);
  state = await action({ action: "join_community", code: community.code });
  assert.equal(state.communities[0].analytics, null);
  await action({ action: "join_community", code: community.code });
  assert.equal((await read()).communities[0].members.length, 2);
  await denied({ action: "propose", communityId: community.id, question: question() }, /curator/);
  await denied({ action: "set_curator", communityId: community.id, userId: b, enabled: true }, /Enterprise/);
  await actor(a);
  await denied({ action: "set_curator", communityId: community.id, userId: b, enabled: "true" }, /flag/);
  await denied({ action: "set_curator", communityId: community.id, userId: admin, enabled: true }, /member/);
  await action({ action: "set_curator", communityId: community.id, userId: b, enabled: true });
  await actor(b);
  state = await action({ action: "propose", communityId: community.id, question: question("¿Se verificará la pregunta propuesta por el curador?") });
  const curatorProposal = state.proposals[0];
  assert.equal(curatorProposal.priority, "normal");
  assert.equal(state.quota.remaining, 0);
  await denied({ action: "propose", communityId: community.id, question: question() }, /quota/);
  await actor(admin);
  await action({ action: "review", proposalId: curatorProposal.id, decision: "approve", note: "Pregunta comunitaria verificada y aprobada" });
  await actor(a);
  const communityQuestionId = (await read()).communities[0].questionIds[0];
  assert.ok(communityQuestionId);
  assert.equal((await read()).communities[0].analytics.suppressed, true);
  assert.equal((await read()).analytics.meanBrier, null); // Previous fixtures contain only 4 distinct resolved users.
  const members = [a, b, newcomer, tieA, tieB];
  for (const member of members) {
    await actor(member);
    await action({ action: "join_community", code: community.code });
    await db.query("select public.submit_forecast($1,$2)", [communityQuestionId, 0.7]);
  }
  await actor(a);
  assert.equal((await read()).communities[0].analytics.meanBrier, null); // Open forecasts never reveal precision.
  assert.equal((await read()).communities[0].analytics.resolvedForecasts, 0);
  await actor(admin);
  await db.query("select public.transition_question($1,'CLOSED')", [communityQuestionId]);
  await db.query("select public.resolve_question($1,1)", [communityQuestionId]);
  await actor(a);
  const aggregates = (await read()).communities[0].analytics;
  assert.equal(aggregates.participants, 5);
  assert.equal(aggregates.resolvedForecasts, 5);
  assert.equal(aggregates.meanBrier, 0.09);
  assert.equal(aggregates.suppressed, false);
  assert.deepEqual(aggregates.byCategory, [{ category: "Economy", count: 5, meanBrier: 0.09 }]);
  assert.equal((await read()).analytics.suppressed, false);
  assert.ok(!JSON.stringify(await read()).includes("Private City"));
  await actor(b);
  assert.equal((await read()).communities[0].analytics, null);
  assert.equal((await read()).analytics, null);
  console.log("PASS invitation communities, current-plan curator rights and resolved-only aggregates with five-person thresholds");

  await actor(a);
  const surveyInput = { action: "create_survey", communityId: community.id, title: "¿Cuál es tu escenario preferido?", purpose: "Con tu consentimiento, analizamos respuestas agregadas para explorar escenarios de prueba.", options: ["Escenario A", "Escenario B"], closesAt: new Date(Date.now() + 86400000).toISOString() };
  for (const options of [["Same", "same"], ["Only"], ["Valid", null], [" ", "Other"], "not an array"]) await denied({ ...surveyInput, options });
  state = await action(surveyInput);
  const survey = state.surveys[0];
  assert.equal(survey.acceptingResponses, true);
  assert.deepEqual(survey.results, { responses: 0, counts: null, suppressed: true });
  await actor(admin);
  assert.deepEqual((await read()).surveys, []);
  await denied({ action: "answer_survey", surveyId: survey.id, optionIndex: 0, consent: true }, /membership/);
  for (const member of members.slice(0, 4)) {
    await actor(member);
    await denied({ action: "answer_survey", surveyId: survey.id, optionIndex: 0, consent: false }, /consent/);
    await denied({ action: "answer_survey", surveyId: survey.id, optionIndex: 0.5, consent: true }, /option/);
    await denied({ action: "answer_survey", surveyId: survey.id, optionIndex: 3, consent: true }, /option/);
    await denied({ action: "answer_survey", surveyId: survey.id, optionIndex: "0", consent: true }, /option/);
    state = await action({ action: "answer_survey", surveyId: survey.id, optionIndex: 0, consent: true });
    assert.equal(state.surveys[0].acceptingResponses, false);
    assert.equal(state.surveys[0].ownOptionIndex, 0);
    await denied({ action: "answer_survey", surveyId: survey.id, optionIndex: 1, consent: true }, /duplicate/);
    if (member !== a) assert.equal(state.surveys[0].results, null);
  }
  await actor(a);
  assert.deepEqual((await read()).surveys[0].results, { responses: 4, counts: null, suppressed: true });
  await actor(tieB);
  await action({ action: "answer_survey", surveyId: survey.id, optionIndex: 1, consent: true });
  await actor(a);
  assert.deepEqual((await read()).surveys[0].results, { responses: 5, counts: [4, 1], suppressed: false });
  assert.ok(!JSON.stringify((await read()).surveys[0].results).includes("userId"));
  await actor(tieB);
  state = await action({ action: "withdraw_survey", surveyId: survey.id });
  assert.equal(state.surveys[0].answered, true);
  assert.equal(state.surveys[0].ownOptionIndex, null);
  assert.equal(state.surveys[0].acceptingResponses, false);
  await denied({ action: "answer_survey", surveyId: survey.id, optionIndex: 1, consent: true }, /duplicate/);
  await actor(a);
  assert.deepEqual((await read()).surveys[0].results, { responses: 4, counts: null, suppressed: true });
  console.log("PASS voluntary single-response surveys, owner-only suppressed results and irreversible withdrawal tombstones");

  await setPlan(a, "free");
  await actor(a);
  state = await read();
  assert.equal(state.plan, "free");
  assert.equal(state.quota.used, 10);
  assert.equal(state.quota.remaining, 0);
  assert.equal(state.analytics, null);
  assert.equal(state.communities[0].analytics, null);
  assert.equal(state.surveys[0].results, null);
  await denied({ action: "create_community", name: "Otra comunidad", description: "No debería existir esta comunidad" }, /Community/);
  await denied({ action: "set_curator", communityId: community.id, userId: b, enabled: true }, /Enterprise/);
  await denied(surveyInput, /Enterprise/);
  await actor(b);
  await denied({ action: "propose", communityId: community.id, question: question() }, /curator/);
  await actor(tieB);
  await denied({ action: "answer_survey", surveyId: survey.id, optionIndex: 1, consent: true }, /Enterprise/);
  await actor(newcomer);
  await action({ action: "withdraw_survey", surveyId: survey.id });
  await db.exec("reset role");
  const erased = (await db.query("select option_index,consent_at,consent_version,withdrawn_at from public.survey_responses where survey_id=$1 and user_id=$2", [survey.id, newcomer])).rows[0];
  assert.equal(erased.option_index, null);
  assert.equal(erased.consent_at, null);
  assert.equal(erased.consent_version, null);
  assert.ok(erased.withdrawn_at);
  await db.query("update public.community_surveys set closes_at=now()-interval '1 day' where id=$1", [survey.id]);
  await db.query("delete from public.community_members where community_id=$1 and user_id=$2", [community.id, b]);
  await actor(b);
  await action({ action: "withdraw_survey", surveyId: survey.id });
  await db.exec("reset role");
  assert.equal((await db.query("select option_index from public.survey_responses where survey_id=$1 and user_id=$2", [survey.id, b])).rows[0].option_index, null);
  await actor(admin);
  assert.deepEqual((await read()).surveys, []);
  assert.equal((await db.query("select * from public.registration_details where user_id=$1", [a])).rows.length, 0);
  console.log("PASS downgrade enforcement and withdrawal after closing or membership loss without exposing personal information");
}
