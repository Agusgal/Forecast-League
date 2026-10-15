"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, BarChart3, Check, CircleHelp, ClipboardList, Layers3, Plus, ShieldCheck, Users, Zap } from "lucide-react";
import type { Bootstrap } from "@/domain/types";
import type { QuestionDraft } from "@/domain/schemas";
import { canCreateCommunities, plans, type ActivityAnalytics, type CommunityView, type Plan, type QuestionProposal, type SurveyView, type WorkspaceAction, type WorkspaceState } from "@/domain/workspace";
import { decimal, label } from "@/lib/locale";
import { api, dateLabel } from "@/lib/utils";
import { Button } from "./ui/button";

type Section = "questions" | "communities" | "plans" | "enterprise" | "moderation";
type RunAction = (action: WorkspaceAction, message: string) => Promise<boolean>;
type ActionProps = { run: RunAction; busy: boolean };
const sections: { id: Section; href: string; label: string }[] = [
  { id: "questions", href: "/proposals", label: "Mis preguntas" },
  { id: "communities", href: "/communities", label: "Comunidades" },
  { id: "plans", href: "/plans", label: "Planes" },
  { id: "enterprise", href: "/enterprise", label: "Enterprise" },
  { id: "moderation", href: "/moderation", label: "Moderación" },
];
const sectionText: Record<Section, { title: string; description: string }> = {
  questions: { title: "La próxima pregunta la hacés vos.", description: "Proponé un futuro posible, definí cómo comprobarlo y enviá tu pregunta a revisión." },
  communities: { title: "Pensar juntos, pronosticar mejor.", description: "Un espacio compartido para preguntas, participación y aprendizaje." },
  plans: { title: "Tu forma de participar.", description: "Desde tu primera pregunta hasta una comunidad que investiga el futuro." },
  enterprise: { title: "Preguntas que generan conocimiento.", description: "Estadísticas agregadas, encuestas voluntarias y curadores para tu comunidad." },
  moderation: { title: "Una pregunta clara cambia el juego.", description: "Revisá propuestas y administrá los planes de las cuentas registradas." },
};
const textValue = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
// Date inputs are explicitly Argentina wall time, regardless of the browser's zone.
const argentinaTimestamp = (value: string) => new Date(`${value}${value.length === 16 ? ":00" : ""}-03:00`).toISOString();
const roleLabel = { owner: "Propietario", curator: "Curador", member: "Miembro" };

export function WorkspaceView({ data, refresh, section }: { data: Bootstrap; refresh: () => Promise<void>; section: Section }) {
  const [state, setState] = useState<WorkspaceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const feedback = useRef<HTMLDivElement>(null);
  const userId = data.user?.id;
  const registered = data.user?.isRegistered;
  useEffect(() => {
    let current = true;
    setLoading(true);
    setState(null);
    setError("");
    setNotice("");
    api<WorkspaceState>("workspace")
      .then((next) => { if (current) setState(next); })
      .catch((cause: unknown) => { if (current) setError(cause instanceof Error ? cause.message : "No pudimos cargar este espacio."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [userId, registered, retry]);
  const run = useCallback<RunAction>(async (action, message) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await api<WorkspaceState>("workspace", action);
      setState(next);
      setNotice(message);
      try { await refresh(); }
      catch { setNotice(`${message} La vista general no pudo actualizarse; recargá la página para verla al día.`); }
      feedback.current?.focus();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos guardar el cambio. Intentá de nuevo.");
      feedback.current?.focus();
      return false;
    } finally { setBusy(false); }
  }, [refresh]);
  const actionProps = { run, busy };
  return (
    <div className="workspace">
      <nav className="workspace-nav" aria-label="Espacio de participación">
        {sections.filter((item) => item.id !== "moderation" || data.user?.isAdmin).map((item) => (
          <Link key={item.id} href={item.href} aria-current={section === item.id ? "page" : undefined}>{item.label}</Link>
        ))}
      </nav>
      <header className="workspace-heading">
        <span className="workspace-eyebrow">FORECAST LEAGUE · PARTICIPÁ</span>
        <h1>{sectionText[section].title}</h1>
        <p>{sectionText[section].description}</p>
      </header>
      <div ref={feedback} tabIndex={-1} className="workspace-feedback">
        {error && <div className="workspace-message workspace-message-error" role="alert">{error}{!state && !loading && <Button variant="outline" size="sm" onClick={() => setRetry((value) => value + 1)}>Reintentar</Button>}</div>}
        {notice && <div className="workspace-message workspace-message-success" role="status"><Check size={19} aria-hidden="true" />{notice}</div>}
      </div>
      {loading ? <div className="workspace-empty" role="status">Cargando tu espacio…</div> : state && <>
        {section === "plans" ? <PlansView state={state} /> : !state.registered ? <RegistrationGate /> : <>
          {section === "questions" && <QuestionsView state={state} userId={userId!} {...actionProps} />}
          {section === "communities" && <CommunitiesView state={state} data={data} {...actionProps} />}
          {section === "enterprise" && <EnterpriseView state={state} data={data} {...actionProps} />}
          {section === "moderation" && (data.user?.isAdmin ? <ModerationView state={state} {...actionProps} /> : <FeatureGate title="Este espacio es de administración." description="Las propuestas se revisan manualmente. Podés seguir el estado de las tuyas en Mis preguntas." href="/proposals" link="Ver mis preguntas" />)}
        </>}
      </>}
    </div>
  );
}

function RegistrationGate() {
  return <div className="workspace-gate workspace-card">
    <div className="workspace-icon"><Users size={28} aria-hidden="true" /></div>
    <h2>Una cuenta para poner tus ideas en juego.</h2>
    <p>Creá tu cuenta Free para proponer una pregunta por día y sumarte a comunidades con un código de invitación.</p>
    <div className="workspace-actions"><Button asChild><Link href="/signup">Crear cuenta <ArrowRight size={17} aria-hidden="true" /></Link></Button><Button variant="outline" asChild><Link href="/login">Ya tengo cuenta</Link></Button></div>
    <Link className="workspace-text-link" href="/plans">Conocer los planes</Link>
  </div>;
}
function FeatureGate({ title, description, href = "/plans", link = "Ver planes" }: { title: string; description: string; href?: string; link?: string }) {
  return <div className="workspace-gate workspace-card"><div className="workspace-icon"><Layers3 size={28} aria-hidden="true" /></div><h2>{title}</h2><p>{description}</p><Button variant="outline" asChild><Link href={href}>{link} <ArrowRight size={17} aria-hidden="true" /></Link></Button></div>;
}
function Field({ label: fieldLabel, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`workspace-field${wide ? " workspace-field-wide" : ""}`}><span>{fieldLabel}</span>{children}</label>;
}
function Quota({ state }: { state: WorkspaceState }) {
  return <section className="workspace-quota" aria-label="Cupo de preguntas">
    <div><span className="workspace-tag">{plans[state.plan].name}</span><h2><strong>{state.quota.remaining}</strong> {state.quota.remaining === 1 ? "pregunta disponible" : "preguntas disponibles"}</h2><p>{state.quota.used} de {state.quota.limit} enviadas hoy · Revisión {plans[state.plan].priority === "priority" ? "prioritaria" : "normal"}</p></div>
    <div className="workspace-quota-reset"><progress value={Math.min(state.quota.used, state.quota.limit)} max={state.quota.limit} aria-label="Cupo utilizado" /><p>Se renueva el {dateLabel(state.quota.resetsAt)}<br />a medianoche de Argentina (UTC−3).</p></div>
  </section>;
}

function QuestionsView({ state, userId, run, busy }: { state: WorkspaceState; userId: string } & ActionProps) {
  const availableCommunities = state.communities.filter((community) => community.members.some((member) => member.userId === userId && (member.role === "curator" || (member.role === "owner" && canCreateCommunities(state.plan)))));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const question: QuestionDraft = {
      title: textValue(values, "title"), description: textValue(values, "description"), category: textValue(values, "category") as QuestionDraft["category"], horizon: textValue(values, "horizon") as QuestionDraft["horizon"],
      opensAt: argentinaTimestamp(textValue(values, "opensAt")), closesAt: argentinaTimestamp(textValue(values, "closesAt")), resolvesAt: argentinaTimestamp(textValue(values, "resolvesAt")),
      resolutionCriteria: textValue(values, "resolutionCriteria"), sourceName: textValue(values, "sourceName"), sourceUrl: textValue(values, "sourceUrl"), visual: textValue(values, "visual") as QuestionDraft["visual"],
    };
    const communityId = textValue(values, "communityId");
    if (await run({ action: "propose", question, ...(communityId ? { communityId } : {}) }, "Tu pregunta ya está en revisión. Podés seguir su estado más abajo.")) form.reset();
  }
  return <>
    <Quota state={state} />
    <div className="workspace-split">
      <section className="workspace-card">
        <div className="workspace-section-title"><Plus size={23} aria-hidden="true" /><h2>Proponer una pregunta</h2></div>
        <p className="workspace-muted">Todos los campos son obligatorios, salvo la comunidad. La respuesta debe poder resolverse con Sí o No.</p>
        {state.quota.remaining === 0 && <div className="workspace-message">Usaste tu cupo de hoy. Podés preparar tu pregunta y enviarla cuando se renueve.</div>}
        <form className="workspace-form" onSubmit={submit}>
          <fieldset disabled={busy}>
            <div className="workspace-fields">
              <Field label="Pregunta" wide><input name="title" required minLength={10} maxLength={180} placeholder="¿Qué hecho concreto podría ocurrir?" /></Field>
              <Field label="Contexto" wide><textarea name="description" required minLength={20} maxLength={3000} rows={4} placeholder="Explicá qué se está pronosticando y por qué importa." /></Field>
              <Field label="Tema"><select name="category" defaultValue="Economy">{["Science & tech", "Climate", "World", "Sports", "Economy"].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
              <Field label="Plazo"><select name="horizon" defaultValue="weekly">{["daily", "weekly", "monthly", "long-term"].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
              <Field label="Apertura · hora argentina"><input name="opensAt" type="datetime-local" required /></Field>
              <Field label="Cierre · hora argentina"><input name="closesAt" type="datetime-local" required /></Field>
              <Field label="Resolución · hora argentina"><input name="resolvesAt" type="datetime-local" required /></Field>
              <Field label="Ilustración"><select name="visual" defaultValue="economy">{["space", "climate", "ai", "world", "sports", "economy"].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
              <Field label="Criterios de resolución" wide><textarea name="resolutionCriteria" required minLength={20} maxLength={3000} rows={4} placeholder="Definí cuándo corresponde Sí, cuándo No y qué fuente permitirá comprobarlo." /></Field>
              <Field label="Nombre de la fuente"><input name="sourceName" required minLength={2} maxLength={120} placeholder="Organismo o publicación verificable" /></Field>
              <Field label="Enlace a la fuente"><input name="sourceUrl" type="url" required pattern="https?://.*" placeholder="https://…" /></Field>
              {availableCommunities.length > 0 && <Field label="Comunidad · opcional" wide><select name="communityId" defaultValue=""><option value="">Sin comunidad</option>{availableCommunities.map((community) => <option key={community.id} value={community.id}>{community.name}</option>)}</select><small>Las preguntas aprobadas son públicas. También aparecerán en esta comunidad.</small></Field>}
            </div>
            <div className="workspace-submit"><Button type="submit" disabled={busy || state.quota.remaining === 0}>{busy ? "Enviando…" : "Enviar a revisión"} <ArrowRight size={17} aria-hidden="true" /></Button><span>El envío usa una pregunta de tu cupo diario.</span></div>
          </fieldset>
        </form>
      </section>
      <aside className="workspace-card workspace-guide"><div className="workspace-section-title"><CircleHelp size={23} aria-hidden="true" /><h2>Una buena pregunta</h2></div><ol><li><strong>Un resultado binario.</strong><p>Un hecho observable que pueda resolverse con Sí o No.</p></li><li><strong>Un plazo concreto.</strong><p>Apertura antes del cierre. Resolución al cierre o después.</p></li><li><strong>Una fuente verificable.</strong><p>Los criterios deben permitir comprobar el resultado sin interpretaciones.</p></li></ol><div className="workspace-note"><ShieldCheck size={20} aria-hidden="true" /><p>La aprobación es manual. La revisión prioritaria se atiende antes que la normal; no hay un plazo garantizado.</p></div><p className="workspace-small">Las propuestas rechazadas también cuentan en el cupo. Una vez publicada, la pregunta conserva sus criterios y fechas.</p></aside>
    </div>
    <section className="workspace-section"><div className="workspace-section-title"><ClipboardList size={24} aria-hidden="true" /><h2>Mis propuestas <span className="workspace-count">{state.proposals.length}</span></h2></div>
      {state.proposals.length ? <div className="workspace-stack">{state.proposals.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} />)}</div> : <div className="workspace-empty">Todavía no enviaste preguntas. Tu primera propuesta empieza arriba.</div>}
    </section>
  </>;
}

function DraftDetails({ question }: { question: QuestionDraft }) {
  return <div className="workspace-draft-details"><p>{question.description}</p><dl><div><dt>Tema y plazo</dt><dd>{label(question.category)} · {label(question.horizon)}</dd></div><div><dt>Apertura</dt><dd>{dateLabel(question.opensAt)} (Argentina)</dd></div><div><dt>Cierre</dt><dd>{dateLabel(question.closesAt)} (Argentina)</dd></div><div><dt>Resolución</dt><dd>{dateLabel(question.resolvesAt)} (Argentina)</dd></div><div className="workspace-field-wide"><dt>Criterios de resolución</dt><dd className="workspace-preserve">{question.resolutionCriteria}</dd></div><div className="workspace-field-wide"><dt>Fuente</dt><dd><a href={question.sourceUrl} target="_blank" rel="noopener noreferrer">{question.sourceName} ↗</a><small>{question.sourceUrl}</small></dd></div></dl></div>;
}
function ProposalCard({ proposal }: { proposal: QuestionProposal }) {
  return <article className="workspace-card workspace-proposal"><div className="workspace-meta"><span className={`workspace-status workspace-status-${proposal.status}`}>{({ pending: "En revisión", approved: "Aprobada", rejected: "Rechazada" })[proposal.status]}</span><span>{proposal.priority === "priority" ? "Revisión prioritaria" : "Revisión normal"}</span><span>{dateLabel(proposal.submittedAt)}</span></div><h3>{proposal.question.title}</h3>
    {proposal.reviewNote && <div className="workspace-review-note"><strong>Devolución de moderación</strong><p>{proposal.reviewNote}</p></div>}
    {proposal.publishedQuestionId && <Link className="workspace-text-link" href={`/questions/${encodeURIComponent(proposal.publishedQuestionId)}`}>Ver pregunta publicada <ArrowRight size={16} aria-hidden="true" /></Link>}
    <details className="workspace-details"><summary>Ver la propuesta completa</summary><DraftDetails question={proposal.question} /></details>
  </article>;
}

function PlansView({ state }: { state: WorkspaceState }) {
  const features: Record<Plan, string[]> = {
    free: ["1 pregunta por día", "Revisión normal", "Sumarte a comunidades por invitación", "Responder encuestas con consentimiento"],
    pro: ["10 preguntas por día", "Revisión prioritaria", "Sumarte a comunidades por invitación", "Responder encuestas con consentimiento"],
    community: ["10 preguntas por día", "Revisión prioritaria", "Crear y gestionar comunidades", "Estadísticas de tus comunidades"],
    enterprise: ["Todo lo incluido en Community", "Estadísticas generales agregadas", "Crear encuestas con consentimiento", "Designar curadores en tus comunidades"],
  };
  return <>
    {state.registered && <Quota state={state} />}
    <div className="workspace-plan-grid">{(Object.keys(plans) as Plan[]).map((plan) => <article key={plan} className={`workspace-card workspace-plan${state.registered && state.plan === plan ? " workspace-plan-current" : ""}`}><div className="workspace-plan-top"><span className="workspace-eyebrow">{plan === "free" ? "EMPEZÁ" : plan === "pro" ? "AMPLIÁ TU VOZ" : plan === "community" ? "CREÁ COMUNIDAD" : "INVESTIGÁ"}</span>{state.registered && state.plan === plan && <span className="workspace-tag">Tu plan</span>}</div><h2>{plans[plan].name}</h2><div className="workspace-plan-quota"><strong>{plans[plan].dailyQuestions}</strong><span>{plans[plan].dailyQuestions === 1 ? "pregunta" : "preguntas"}<br />por día</span></div><ul>{features[plan].map((feature) => <li key={feature}><Check size={17} aria-hidden="true" /><span>{feature}</span></li>)}</ul>{!state.registered && plan === "free" && <Button asChild><Link href="/signup">Crear cuenta Free</Link></Button>}</article>)}</div>
    <div className="workspace-note workspace-card"><ShieldCheck size={23} aria-hidden="true" /><div><h3>Los planes los asigna administración.</h3><p>En esta versión no hay compras ni cobros. Todas las preguntas pasan por aprobación manual, sin tiempos de respuesta garantizados. El cupo se renueva a medianoche de Argentina.</p><p>Enterprise accede a estadísticas agregadas y encuestas voluntarias. Los datos personales del registro permanecen privados.</p></div></div>
  </>;
}

function CommunitiesView({ state, data, run, busy }: { state: WorkspaceState; data: Bootstrap } & ActionProps) {
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form);
    if (await run({ action: "create_community", name: textValue(values, "name"), description: textValue(values, "description") }, "Tu comunidad está lista. Compartí su código para invitar participantes.")) form.reset();
  }
  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form);
    if (await run({ action: "join_community", code: textValue(values, "code").toUpperCase() }, "Ya sos parte de la comunidad.")) form.reset();
  }
  return <>
    <div className="workspace-two-col"><section className="workspace-card"><div className="workspace-section-title"><Users size={23} aria-hidden="true" /><h2>Sumarte a una comunidad</h2></div><p className="workspace-muted">Disponible con cualquier plan. Pedile el código a alguien de la comunidad.</p><form className="workspace-form" onSubmit={join}><fieldset disabled={busy}><Field label="Código de invitación"><input name="code" required minLength={6} maxLength={16} pattern="[A-Za-z0-9]{6,16}" autoCapitalize="characters" autoComplete="off" placeholder="Ingresá el código" /></Field><Button type="submit" disabled={busy}>Unirme</Button></fieldset></form></section>
      {canCreateCommunities(state.plan) ? <section className="workspace-card"><div className="workspace-section-title"><Plus size={23} aria-hidden="true" /><h2>Crear una comunidad</h2></div><form className="workspace-form" onSubmit={create}><fieldset disabled={busy}><Field label="Nombre"><input name="name" required minLength={3} maxLength={60} /></Field><Field label="¿Qué los reúne?"><textarea name="description" required minLength={10} maxLength={500} rows={3} /></Field><Button type="submit" disabled={busy}>Crear comunidad</Button></fieldset></form></section> : <FeatureGate title="Dale un lugar a tu comunidad." description="Los planes Community y Enterprise permiten crear comunidades y ver sus estadísticas de participación y acierto." />}
    </div>
    <section className="workspace-section"><div className="workspace-section-title"><Users size={24} aria-hidden="true" /><h2>Mis comunidades <span className="workspace-count">{state.communities.length}</span></h2></div>{state.communities.length ? <div className="workspace-stack">{state.communities.map((community) => <CommunityCard key={community.id} community={community} state={state} data={data} run={run} busy={busy} />)}</div> : <div className="workspace-empty">Todavía no pertenecés a una comunidad. Sumate con un código o creá la tuya si tu plan lo permite.</div>}</section>
  </>;
}

function CommunityCard({ community, state, data, run, busy }: { community: CommunityView; state: WorkspaceState; data: Bootstrap } & ActionProps) {
  const role = community.members.find((member) => member.userId === data.user?.id)?.role ?? "member";
  const surveys = state.surveys.filter((survey) => survey.communityId === community.id);
  return <article className="workspace-card workspace-community"><div className="workspace-community-heading"><div><span className="workspace-tag">{roleLabel[role]}</span><h3>{community.name}</h3><p>{community.description}</p></div><div className="workspace-invite"><span>Código de invitación</span><code>{community.code}</code><small>{community.members.length} {community.members.length === 1 ? "miembro" : "miembros"}</small></div></div>
    {community.analytics && <Analytics analytics={community.analytics} />}
    <div className="workspace-two-col workspace-community-content"><section><h4>Preguntas de la comunidad</h4>{community.questionIds.length ? <ul className="workspace-question-links">{community.questionIds.map((id) => <li key={id}><Link href={`/questions/${encodeURIComponent(id)}`}>{data.questions.find((question) => question.id === id)?.title ?? "Ver pregunta publicada"}<ArrowRight size={16} aria-hidden="true" /></Link></li>)}</ul> : <p className="workspace-muted">Las propuestas aparecerán acá cuando sean aprobadas.</p>}{(role === "curator" || (role === "owner" && canCreateCommunities(state.plan))) && <Link className="workspace-text-link" href="/proposals">Proponer para esta comunidad <Plus size={16} aria-hidden="true" /></Link>}</section><section><h4>Participantes</h4><ul className="workspace-member-list">{community.members.map((member) => <li key={member.userId}><span>{member.username}</span><span>{roleLabel[member.role]}</span></li>)}</ul></section></div>
    {surveys.length > 0 && <section className="workspace-community-surveys"><h4>Encuestas voluntarias</h4><div className="workspace-stack">{surveys.map((survey) => <SurveyCard key={survey.id} survey={survey} run={run} busy={busy} />)}</div></section>}
  </article>;
}

function Analytics({ analytics }: { analytics: ActivityAnalytics & { registeredUsers?: number } }) {
  return <div className="workspace-analytics"><div className="workspace-metrics">{analytics.registeredUsers !== undefined && <div><strong>{analytics.registeredUsers}</strong><span>Cuentas registradas</span></div>}<div><strong>{analytics.participants}</strong><span>Participantes</span></div><div><strong>{analytics.forecasts}</strong><span>Pronósticos</span></div><div><strong>{analytics.resolvedForecasts}</strong><span>Pronósticos resueltos</span></div><div><strong>{analytics.meanBrier === null ? "—" : decimal(analytics.meanBrier)}</strong><span>Brier promedio</span></div></div><p className="workspace-small">Brier mide el error del pronóstico: cuanto más cerca de 0, mejor. Los promedios se muestran con al menos 5 participantes distintos con resultados resueltos; el mismo umbral se aplica a cada tema.</p>{analytics.suppressed && <p className="workspace-privacy-note"><ShieldCheck size={16} aria-hidden="true" />Todavía no se alcanza el mínimo para mostrar el promedio.</p>}{analytics.byCategory.length > 0 && <div className="workspace-table-wrap"><table className="workspace-table"><caption>Resultados agregados por tema</caption><thead><tr><th>Tema</th><th>Resueltos</th><th>Brier promedio</th></tr></thead><tbody>{analytics.byCategory.map((item) => <tr key={item.category}><td>{label(item.category)}</td><td>{item.count}</td><td>{decimal(item.meanBrier)}</td></tr>)}</tbody></table></div>}</div>;
}

function SurveyCard({ survey, run, busy }: { survey: SurveyView } & ActionProps) {
  const closed = Date.parse(survey.closesAt) <= Date.now();
  const accepting = !closed && survey.acceptingResponses;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = new FormData(event.currentTarget);
    await run({ action: "answer_survey", surveyId: survey.id, optionIndex: Number(values.get("optionIndex")), consent: true }, "Tu respuesta se guardó. Podés retirarla cuando quieras desde esta encuesta.");
  }
  return <article className="workspace-survey"><div className="workspace-meta"><span className="workspace-tag">{closed ? "Cerrada" : accepting ? "Abierta" : "No disponible"}</span><span>Cierre: {dateLabel(survey.closesAt)} (Argentina)</span></div><h3>{survey.title}</h3><p className="workspace-preserve">{survey.purpose}</p>
    {survey.answered ? <div className="workspace-survey-answer">{survey.ownOptionIndex === null ? <p><Check size={17} aria-hidden="true" />Respuesta retirada. Ya no se incluye en los resultados y no podés volver a responder esta encuesta.</p> : <><p><Check size={17} aria-hidden="true" /><span>Tu respuesta: <strong>{survey.options[survey.ownOptionIndex]}</strong></span></p><Button variant="outline" size="sm" disabled={busy} onClick={() => run({ action: "withdraw_survey", surveyId: survey.id }, "Retiraste tu respuesta. Se eliminó su contenido y dejó de contar en los resultados.")}>Retirar respuesta y consentimiento</Button></>}</div> : closed ? <p className="workspace-muted">Esta encuesta ya no recibe respuestas.</p> : <form className="workspace-form" onSubmit={submit}><fieldset disabled={busy}><legend>Elegí una respuesta</legend><div className="workspace-options">{survey.options.map((option, index) => <label key={index}><input type="radio" name="optionIndex" value={index} required /><span>{option}</span></label>)}</div><label className="workspace-consent"><input type="checkbox" name="consent" required /><span>Quiero participar y autorizo el uso de mi respuesta para el propósito indicado. El propietario verá solo resultados agregados, con al menos 5 respuestas. Puedo retirar mi respuesta y consentimiento cuando quiera.</span></label><Button type="submit" disabled={busy}>Enviar respuesta</Button></fieldset></form>}
    {survey.results && <section className="workspace-survey-results"><h4>Resultados agregados · solo propietario</h4><p>{survey.results.responses} {survey.results.responses === 1 ? "respuesta activa" : "respuestas activas"}</p>{survey.results.suppressed || !survey.results.counts ? <p className="workspace-small">La distribución se habilita con al menos 5 respuestas activas. No se muestran respuestas individuales.</p> : <ul>{survey.options.map((option, index) => <li key={index}><div><span>{option}</span><strong>{survey.results!.counts![index]}</strong></div><progress aria-label={`${option}: ${survey.results!.counts![index]} respuestas`} value={survey.results!.counts![index]} max={Math.max(1, survey.results!.responses)} /></li>)}</ul>}</section>}
  </article>;
}

function EnterpriseView({ state, data, run, busy }: { state: WorkspaceState; data: Bootstrap } & ActionProps) {
  if (state.plan !== "enterprise") return <FeatureGate title="Conocimiento colectivo, con consentimiento." description="Enterprise suma estadísticas generales agregadas, encuestas voluntarias y curadores. El plan no da acceso a datos personales del registro." />;
  const owned = state.communities.filter((community) => community.ownerId === data.user?.id);
  return <>
    <div className="workspace-note workspace-enterprise-note"><ShieldCheck size={25} aria-hidden="true" /><div><strong>La privacidad es parte del producto.</strong><p>Las estadísticas son agregadas. Las encuestas requieren consentimiento y sus respuestas se pueden retirar. El plan no habilita consultar datos personales del registro.</p></div></div>
    {state.analytics && <section className="workspace-card"><div className="workspace-section-title"><BarChart3 size={24} aria-hidden="true" /><h2>Actividad general</h2></div><p className="workspace-muted">Pronósticos de cuentas registradas en Forecast League.</p><Analytics analytics={state.analytics} /></section>}
    {owned.length === 0 ? <FeatureGate title="Tu investigación empieza con una comunidad." description="Creá una comunidad, invitá participantes y después publicá encuestas o designá curadores." href="/communities" link="Crear comunidad" /> : <>
      <div className="workspace-two-col workspace-section"><CreateSurvey communities={owned} run={run} busy={busy} /><section className="workspace-card"><div className="workspace-section-title"><Users size={23} aria-hidden="true" /><h2>Curadores de preguntas</h2></div><p className="workspace-muted">Los market makers de Forecast League son curadores: proponen preguntas para su comunidad y pueden aportar pronósticos iniciales, igual que cualquier participante.</p><div className="workspace-note"><p>No operan con dinero ni publican sin revisión. Se mantiene el cupo diario del plan de cada curador.</p></div><div className="workspace-stack">{owned.map((community) => <CuratorForm key={community.id} community={community} run={run} busy={busy} />)}</div></section></div>
      <section className="workspace-section"><div className="workspace-section-title"><ClipboardList size={24} aria-hidden="true" /><h2>Mis encuestas</h2></div>{state.surveys.some((survey) => survey.ownerId === data.user?.id) ? <div className="workspace-stack">{state.surveys.filter((survey) => survey.ownerId === data.user?.id).map((survey) => <div className="workspace-card" key={survey.id}><p className="workspace-eyebrow">{owned.find((community) => community.id === survey.communityId)?.name}</p><SurveyCard survey={survey} run={run} busy={busy} /></div>)}</div> : <div className="workspace-empty">Todavía no creaste encuestas. Definí un propósito claro y compartilo con tu comunidad.</div>}</section>
    </>}
  </>;
}

function CreateSurvey({ communities, run, busy }: { communities: CommunityView[] } & ActionProps) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form);
    if (await run({ action: "create_survey", communityId: textValue(values, "communityId"), title: textValue(values, "title"), purpose: textValue(values, "purpose"), options: textValue(values, "options").split("\n").map((value) => value.trim()).filter(Boolean), closesAt: argentinaTimestamp(textValue(values, "closesAt")) }, "Encuesta creada. Los miembros pueden responderla desde su comunidad.")) form.reset();
  }
  return <section className="workspace-card"><div className="workspace-section-title"><ClipboardList size={23} aria-hidden="true" /><h2>Crear una encuesta</h2></div><p className="workspace-muted">Respuestas voluntarias de los miembros. La encuesta no cambia puntos ni clasificaciones.</p><form className="workspace-form" onSubmit={submit}><fieldset disabled={busy}><Field label="Comunidad"><select name="communityId" required>{communities.map((community) => <option key={community.id} value={community.id}>{community.name}</option>)}</select></Field><Field label="Pregunta de la encuesta"><input name="title" required minLength={10} maxLength={180} /></Field><Field label="Propósito y uso de las respuestas"><textarea name="purpose" required minLength={20} maxLength={1000} rows={4} placeholder="Explicá qué buscás conocer y para qué usarás los resultados." /></Field><Field label="Entre 2 y 6 opciones · una por línea"><textarea name="options" required rows={5} maxLength={605} placeholder={"Primera opción\nSegunda opción"} /><small>Usá opciones distintas, de hasta 100 caracteres cada una.</small></Field><Field label="Cierre · hora argentina"><input name="closesAt" type="datetime-local" required /></Field><Button type="submit" disabled={busy}>Crear encuesta</Button></fieldset></form></section>;
}
function CuratorForm({ community, run, busy }: { community: CommunityView } & ActionProps) {
  const members = community.members.filter((member) => member.role !== "owner");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = new FormData(event.currentTarget);
    await run({ action: "set_curator", communityId: community.id, userId: textValue(values, "userId"), enabled: values.get("role") === "curator" }, "Rol actualizado en la comunidad.");
  }
  return <div className="workspace-curator"><h3>{community.name}</h3>{members.length ? <form className="workspace-form" onSubmit={submit}><fieldset disabled={busy}><Field label="Participante"><select name="userId" required>{members.map((member) => <option key={member.userId} value={member.userId}>{member.username} · {roleLabel[member.role]}</option>)}</select></Field><Field label="Asignar rol"><select name="role" defaultValue="curator"><option value="curator">Curador</option><option value="member">Miembro</option></select></Field><Button type="submit" variant="outline" size="sm" disabled={busy}>Guardar rol</Button></fieldset></form> : <p className="workspace-small">Invitá a otra persona a la comunidad para asignarle el rol de curador.</p>}</div>;
}

function ModerationView({ state, run, busy }: { state: WorkspaceState } & ActionProps) {
  return <>
    <div className="workspace-note"><ShieldCheck size={24} aria-hidden="true" /><p>Primero aparecen las propuestas con revisión prioritaria; dentro de cada prioridad se respeta el orden de llegada. Revisá que las fechas sigan vigentes y que el resultado sea verificable.</p></div>
    <section className="workspace-section"><div className="workspace-section-title"><ClipboardList size={24} aria-hidden="true" /><h2>Pendientes de revisión <span className="workspace-count">{state.reviewQueue.length}</span></h2></div>{state.reviewQueue.length ? <div className="workspace-stack">{state.reviewQueue.map((proposal) => <ReviewCard key={proposal.id} proposal={proposal} run={run} busy={busy} />)}</div> : <div className="workspace-empty">La bandeja está al día. No hay propuestas pendientes.</div>}</section>
    <section className="workspace-section"><div className="workspace-section-title"><Layers3 size={24} aria-hidden="true" /><h2>Planes de las cuentas</h2></div><p className="workspace-muted">La asignación es administrativa y no genera cobros. Cada cuenta nueva empieza en Free.</p><div className="workspace-stack">{state.accounts.map((account) => <AccountPlan key={`${account.userId}-${account.plan}`} account={account} run={run} busy={busy} />)}</div></section>
  </>;
}
function ReviewCard({ proposal, run, busy }: { proposal: QuestionProposal } & ActionProps) {
  const expired = Date.parse(proposal.question.closesAt) <= Date.now();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = new FormData(event.currentTarget); const decision = textValue(values, "decision") as "approve" | "reject";
    await run({ action: "review", proposalId: proposal.id, decision, note: textValue(values, "note") }, decision === "approve" ? "Pregunta aprobada y publicada." : "Propuesta rechazada. La devolución ya está disponible para su autor.");
  }
  return <article className="workspace-card workspace-review"><div className="workspace-meta"><span className={`workspace-tag${proposal.priority === "priority" ? " workspace-tag-priority" : ""}`}>{proposal.priority === "priority" ? <><Zap size={14} aria-hidden="true" />Prioritaria</> : "Normal"}</span><span>{proposal.username} · {plans[proposal.plan].name}</span><span>{dateLabel(proposal.submittedAt)}</span></div><h3>{proposal.question.title}</h3><DraftDetails question={proposal.question} />{expired && <p className="workspace-message workspace-message-error">El cierre ya venció. Rechazá esta propuesta para que su autor pueda enviarla con nuevas fechas.</p>}<form className="workspace-form workspace-review-form" onSubmit={submit}><fieldset disabled={busy}><Field label="Decisión"><select name="decision" defaultValue={expired ? "reject" : "approve"}><option value="approve" disabled={expired}>Aprobar y publicar</option><option value="reject">Rechazar</option></select></Field><Field label="Devolución para el autor"><textarea name="note" required minLength={5} maxLength={1000} rows={3} placeholder="Explicá la decisión o qué necesita corregir." /></Field><Button type="submit" disabled={busy}>Confirmar revisión</Button></fieldset></form></article>;
}
function AccountPlan({ account, run, busy }: { account: WorkspaceState["accounts"][number] } & ActionProps) {
  const [plan, setPlan] = useState<Plan>(account.plan);
  return <form className="workspace-card workspace-account-plan" onSubmit={(event) => { event.preventDefault(); void run({ action: "set_plan", userId: account.userId, plan }, `Plan de ${account.username} actualizado a ${plans[plan].name}.`); }}><div><strong>{account.username}</strong><span>Plan actual: {plans[account.plan].name}</span></div><label><span className="workspace-sr-only">Plan para {account.username}</span><select value={plan} disabled={busy} onChange={(event) => setPlan(event.target.value as Plan)}>{(Object.keys(plans) as Plan[]).map((value) => <option key={value} value={value}>{plans[value].name}</option>)}</select></label><Button type="submit" size="sm" variant="outline" disabled={busy || plan === account.plan}>Guardar plan</Button></form>;
}
