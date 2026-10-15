"use client";
import { label as localLabel, decimal } from "@/lib/locale";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Globe2,
  LockKeyhole,
  Medal,
  Plus,
  Settings2,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Bootstrap, LeaderboardEntry, QuestionView } from "@/domain/types";
import { api, dateLabel, percent } from "@/lib/utils";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import { Avatar, QuestionArt } from "./visuals";
import { ConsensusCharts } from "./question-detail";
type DataProps = { data: Bootstrap };
type RefreshProps = DataProps & { refresh: () => Promise<void> };
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>
          {title}
          <span>.</span>
        </h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
function RankingTable({
  entries,
  self,
}: {
  entries: LeaderboardEntry[];
  self?: string;
}) {
  return (
    <div className="rankings-table">
      <div className="ranking-row ranking-header">
        <span>PUESTO</span>
        <span>PARTICIPANTE</span>
        <span>BRIER ↓</span>
        <span>RESUELTAS</span>
        <span>PUNTOS</span>
      </div>
      {entries.map((entry, index) => (
        <div
          className={`ranking-row ${entry.userId === self ? "is-you" : ""}`}
          key={entry.userId}
        >
          <span className={`rank-position rank-${entry.rank}`}>
            {entry.rank === 0 ? (
              "—"
            ) : entry.rank <= 3 ? (
              <>
                <Medal size={23} />
                <span className="sr-only">Puesto {entry.rank}</span>
              </>
            ) : (
              String(entry.rank).padStart(2, "0")
            )}
          </span>
          <div className="rank-person">
            <Avatar name={entry.username} small index={index} />
            <div>
              <strong>
                {entry.username}{" "}
                {entry.userId === self && <span className="you-pill">vos</span>}
              </strong>
              <span>{localLabel(entry.country)}</span>
            </div>
          </div>
          <span>{entry.resolvedCount ? decimal(entry.meanBrier) : "—"}</span>
          <span>{entry.resolvedCount}</span>
          <strong>
            {entry.resolvedCount ? entry.points.toLocaleString("es-AR") : "—"}
          </strong>
        </div>
      ))}
      {!entries.length && (
        <div className="empty-state compact">
          <Target />
          <h3>El punto de partida está abierto.</h3>
          <p>La clasificación aparece cuando se resuelven los pronósticos.</p>
        </div>
      )}
    </div>
  );
}
export function LeaderboardView({ data }: DataProps) {
  const [region, setRegion] = useState("global");
  const entries = data.leaderboard.filter(
    (e) => region === "global" || e.country === data.user?.country,
  );
  return (
    <>
      <PageHeading
        eyebrow="UN POCO DE COMPETENCIA AMISTOSA"
        title="Tu criterio se gana su lugar"
        description="Los pronósticos precisos llegan más lejos. La precisión siempre va primero."
      />
      <div className="leaderboard-intro">
        <span className="large-icon">
          <Trophy size={34} strokeWidth={1.5} />
        </span>
        <div>
          <span className="eyebrow">LA LIGA GLOBAL</span>
          <h2>Buen criterio. Medición justa.</h2>
          <p>
            La clasificación usa el Brier promedio de los pronósticos resueltos.
            Todos los puntajes son provisionales.
          </p>
        </div>
        <span className="outline-badge">HISTÓRICO</span>
      </div>
      <div className="panel">
        <div className="panel-header">
          <div className="segmented">
            <button
              className={region === "global" ? "active" : ""}
              onClick={() => setRegion("global")}
            >
              <Globe2 size={15} /> Global
            </button>
            <button
              disabled={!data.user}
              className={region === "country" ? "active" : ""}
              onClick={() => setRegion("country")}
            >
              Tu país
            </button>
          </div>
          <span className="small muted">
            {data.mode === "demo"
              ? "Clasificación simulada de la demo"
              : "Clasificación provisional"}
          </span>
        </div>
        <RankingTable entries={entries} self={data.user?.id} />
      </div>
      <div className="explainer-grid">
        <div>
          <ShieldCheck size={22} />
          <h3>Precisión antes que cantidad</h3>
          <p>
            Puntos = 1.000 × (1 − Brier promedio). Hacer más pronósticos no
            aumenta tu puntaje por sí solo.
          </p>
        </div>
        <div>
          <Target size={22} />
          <h3>Un puntaje con sentido</h3>
          <p>
            El Brier va de 0 a 1. Cuanto menor, mejor. Las preguntas pendientes
            o anuladas no suman puntos.
          </p>
        </div>
        <div>
          <Users size={22} />
          <h3>Una comparación justa</h3>
          <p>
            La clasificación pública es exploratoria. Las ligas privadas
            comparan preguntas compartidas; las competencias oficiales necesitan
            un conjunto fijo de preguntas.
          </p>
        </div>
      </div>
    </>
  );
}
export function LeaguesView({
  data,
  refresh,
  onAuth,
}: RefreshProps & { onAuth: () => void }) {
  const [dialog, setDialog] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [expanded, setExpanded] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("join");
    if (code) {
      setInviteCode(code);
      setDialog("join");
    }
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!data.user) {
      onAuth();
      return;
    }
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      if (dialog === "create")
        await api("leagues", {
          name: form.get("name"),
          description: form.get("description"),
          period: form.get("period"),
        });
      else await api("leagues/join", { code: form.get("code") });
      await refresh();
      setDialog(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la liga.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/leagues?join=${encodeURIComponent(code)}`,
      );
      setCopied(code);
    } catch {
      setCopied(`manual:${code}`);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="TU COMUNIDAD. TUS PRONÓSTICOS."
        title="Una mirada compartida al futuro"
        description="Sumá a tus amigos. Comparen perspectivas. Que el futuro resuelva el debate."
      >
        <Button
          onClick={() => {
            setDialog("create");
            setError("");
          }}
        >
          <Plus size={17} /> Crear una liga
        </Button>
      </PageHeading>
      <div className="league-hero">
        <div>
          <span className="eyebrow">
            TU GRUPO DE AMIGOS, CON TABLA DE POSICIONES
          </span>
          <h2>
            Un poco de competencia.
            <br />
            Muchas perspectivas.
          </h2>
          <p>
            Las ligas privadas convierten la curiosidad cotidiana en
            <br />
            algo para compartir con tu comunidad.
          </p>
          <button
            className="text-button"
            onClick={() => {
              setDialog("join");
              setError("");
            }}
          >
            ¿Tenés una invitación? Sumate a una liga <ArrowRight size={17} />
          </button>
        </div>
        <div className="league-orbits" aria-hidden="true">
          <span className="league-orbit-center">
            <Users size={40} strokeWidth={1.5} />
          </span>
          <Avatar name="Vos" index={1} />
          <Avatar name="Nosotros" index={3} />
          <span className="orbit-star">✳</span>
        </div>
      </div>
      <div className="section-title leagues-label">
        <h2>
          Tus ligas <span className="count-badge">{data.leagues.length}</span>
        </h2>
        <button className="text-button" onClick={() => setDialog("join")}>
          Ingresar con un código <Plus size={16} />
        </button>
      </div>
      {!data.leagues.length ? (
        <div className="empty-state league-empty">
          <div className="empty-icon">
            <Users size={26} />
          </div>
          <h3>Toda gran liga empieza con una persona.</h3>
          <p>Creá la tuya e invitá a quienes comparten tu curiosidad.</p>
          <Button variant="outline" onClick={() => setDialog("create")}>
            Creá tu primera liga <ArrowRight size={16} />
          </Button>
        </div>
      ) : (
        <div className="league-grid">
          {data.leagues.map((league) => (
            <article className="league-card" key={league.id}>
              <div className="section-title">
                <span className="league-icon">
                  <Users size={24} />
                </span>
                <span className="pill">{localLabel(league.period)}</span>
              </div>
              <h2>{league.name}</h2>
              <p>
                {league.description || "Un grupo privado de mentes curiosas."}
              </p>
              <div className="league-meta">
                <span>
                  <Users size={15} />
                  {league.memberCount} integrante
                  {league.memberCount === 1 ? "" : "s"}
                </span>
                <span>
                  <LockKeyhole size={14} />
                  Privada
                </span>
              </div>
              <div className="invite-code">
                <span>CÓDIGO DE INVITACIÓN</span>
                <strong>{league.code}</strong>
                <button
                  aria-label={`Copiar invitación de ${league.name}`}
                  onClick={() => copy(league.code)}
                >
                  {copied === league.code ? (
                    <Check size={17} />
                  ) : (
                    <Copy size={17} />
                  )}
                </button>
              </div>
              {copied === league.code && (
                <p className="copy-feedback" role="status">
                  Enlace de invitación copiado.
                </p>
              )}
              {copied === `manual:${league.code}` && (
                <p className="small">Compartí este código: {league.code}</p>
              )}
              <button
                className="league-rank-toggle"
                onClick={() =>
                  setExpanded(expanded === league.id ? "" : league.id)
                }
              >
                Ver clasificación de preguntas compartidas{" "}
                <ChevronRight size={17} />
              </button>
              {expanded === league.id && (
                <div className="league-rankings">
                  <p className="small muted">
                    Solo cuentan las preguntas que respondieron todos los
                    integrantes. La clasificación es provisional.
                  </p>
                  {league.members.map((m, i) => (
                    <div key={m.userId}>
                      <span>{m.rank || "—"}</span>
                      <Avatar name={m.username} small index={i} />
                      <strong>{m.username}</strong>
                      <span>
                        {m.resolvedCount ? `${m.points} pts` : "Sin puesto"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      <div className="info-box league-info">
        <ShieldCheck size={20} />
        <p>
          Todos juegan con las mismas reglas. Los puntos reflejan la precisión
          en preguntas resueltas compartidas, sin ventajas por dinero.
        </p>
      </div>
      <Dialog
        open={!!dialog}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent>
          <span className="modal-symbol">
            <Users size={25} />
          </span>
          <DialogTitle className="modal-title">
            {dialog === "create"
              ? "Creá algo con tu comunidad."
              : "Hay lugar para tu perspectiva."}
          </DialogTitle>
          <DialogDescription>
            {dialog === "create"
              ? "Creá una liga privada. Tu código de invitación estará listo al instante."
              : "Ingresá el código de invitación que te compartieron."}
          </DialogDescription>
          <form className="form-stack" onSubmit={submit}>
            {dialog === "create" ? (
              <>
                <label>
                  Nombre de la liga
                  <input
                    name="name"
                    required
                    minLength={3}
                    maxLength={60}
                    placeholder="La mesa del domingo"
                  />
                </label>
                <label>
                  Contanos un poco sobre tu liga
                  <textarea
                    name="description"
                    maxLength={300}
                    placeholder="Grandes preguntas, competencia amistosa."
                    rows={3}
                  />
                </label>
                <label>
                  Frecuencia
                  <select name="period">
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                  </select>
                </label>
              </>
            ) : (
              <label>
                Código de invitación
                <input
                  name="code"
                  required
                  minLength={4}
                  maxLength={32}
                  defaultValue={inviteCode}
                  placeholder="Ingresá tu código"
                  autoCapitalize="characters"
                />
              </label>
            )}
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            <Button disabled={busy}>
              {busy
                ? "Un momento…"
                : dialog === "create"
                  ? "Crear liga"
                  : "Sumarme a la liga"}
              <ArrowRight size={16} />
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function WorldView({
  data,
  openQuestion,
}: DataProps & { openQuestion: (q: QuestionView) => void }) {
  const unlocked = data.questions.filter((q) => q.consensus);
  const [selected, setSelected] = useState("");
  const question = unlocked.find((q) => q.id === selected) ?? unlocked[0];
  return (
    <>
      <PageHeading
        eyebrow="MUCHAS MENTES. UNA MIRADA MÁS AMPLIA."
        title="Qué vemos venir"
        description="Explorá una mirada colectiva, formada por pronósticos independientes."
      />
      <div className="world-summary">
        <Globe2 size={38} strokeWidth={1.2} />
        <div>
          <h2>
            {unlocked.length}{" "}
            {unlocked.length === 1
              ? "perspectiva disponible"
              : "perspectivas disponibles"}
          </h2>
          <p>
            {data.mode === "demo"
              ? "Incluye pronósticos de ejemplo de la comunidad, identificados como simulaciones."
              : "Basado en pronósticos reales enviados a la plataforma."}
          </p>
        </div>
      </div>
      {question ? (
        <div className="world-layout">
          <div className="world-question-list">
            {unlocked.map((q) => (
              <button
                key={q.id}
                className={question.id === q.id ? "active" : ""}
                onClick={() => setSelected(q.id)}
              >
                <QuestionArt visual={q.visual} />
                <div>
                  <span>{localLabel(q.category)}</span>
                  <strong>{q.title}</strong>
                </div>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
          <section className="panel world-chart">
            <span className="eyebrow">
              {question.isDemo
                ? "DATOS SIMULADOS"
                : "PERSPECTIVA DE LA COMUNIDAD"}
            </span>
            <h2>{question.title}</h2>
            <ConsensusCharts question={question} />
            <Button variant="outline" onClick={() => openQuestion(question)}>
              Revisá tu pronóstico <ArrowUpRight size={16} />
            </Button>
          </section>
        </div>
      ) : (
        <div className="empty-state world-empty">
          <span className="empty-icon">
            <LockKeyhole size={28} />
          </span>
          <h2>Primero tu perspectiva. Después, la del mundo.</h2>
          <p>
            Hacé tu primer pronóstico para ver la distribución
            <br />y el historial de las predicciones de la comunidad.
          </p>
          <Button asChild>
            <Link href="/forecasts">
              Explorar las preguntas <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      )}
      <div className="section-title">
        <h2>Más perspectivas por descubrir</h2>
      </div>
      <div className="locked-question-grid">
        {data.questions
          .filter((q) => !q.consensus && q.status === "PUBLISHED")
          .slice(0, 4)
          .map((q) => (
            <button
              className="locked-question"
              key={q.id}
              onClick={() => openQuestion(q)}
            >
              <QuestionArt visual={q.visual} />
              <h3>{q.title}</h3>
              <span>
                <LockKeyhole size={14} /> Pronosticá para explorar{" "}
                <ArrowUpRight size={15} />
              </span>
            </button>
          ))}
      </div>
    </>
  );
}
export function ProfileView({
  data,
  refresh,
  onAuth,
  openQuestion,
}: RefreshProps & {
  onAuth: () => void;
  openQuestion: (q: QuestionView) => void;
}) {
  const [edit, setEdit] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const history = data.questions.filter((q) => q.forecast);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      await api("profile", {
        username: form.get("username"),
        country: form.get("country"),
      });
      await refresh();
      setEdit(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo actualizar el perfil.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="TU CAMINO COMO PRONOSTICADOR"
        title="Una mente en crecimiento"
        description="Cada predicción es una oportunidad para entender mejor tu criterio."
      />
      {!data.user ? (
        <div className="empty-state">
          <Target size={32} />
          <h2>Empezá a construir tu historial.</h2>
          <p>
            Iniciá sesión para guardar tus pronósticos, sumarte a ligas y seguir
            tu progreso.
          </p>
          <Button onClick={onAuth}>
            Iniciar sesión <ArrowRight size={16} />
          </Button>
        </div>
      ) : (
        <>
          <div className="profile-banner">
            <Avatar name={data.user.username} />
            <div>
              <h2>{data.user.username}</h2>
              <p>
                {localLabel(data.user.country)} <span>·</span>{" "}
                {data.mode === "demo"
                  ? data.user.isRegistered
                    ? "Cuenta de demo local"
                    : "Perfil de demo local"
                  : "Pensamiento independiente"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEdit(true)}>
              Editar perfil
            </Button>
          </div>
          <div className="stat-grid">
            <div>
              <span>
                <Target size={17} /> Brier promedio
              </span>
              <strong>
                {data.stats.meanBrier === null
                  ? "—"
                  : decimal(data.stats.meanBrier)}
              </strong>
              <p>Cuanto menor, mejor · solo resueltos</p>
            </div>
            <div>
              <span>
                <Sparkles size={17} /> Puntos provisionales
              </span>
              <strong>
                {data.stats.meanBrier === null
                  ? "—"
                  : data.stats.points.toLocaleString("es-AR")}
              </strong>
              <p>Precisión, sin bonus por cantidad</p>
            </div>
            <div>
              <span>
                <CheckCircle2 size={17} /> Pronósticos resueltos
              </span>
              <strong>{data.stats.resolvedCount}</strong>
              <p>De {data.stats.forecastCount} pronósticos totales</p>
            </div>
          </div>
          <div className="profile-analytics">
            <div className="panel">
              <div className="panel-header">
                <h3>Tu calibración</h3>
                <span className="pill">APRENDIZAJE</span>
              </div>
              {data.stats.calibration.length ? (
                <>
                  <div className="chart calibration-chart">
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart
                        data={data.stats.calibration}
                        margin={{ left: -15, right: 25, top: 15, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e7ece5" />
                        <XAxis
                          dataKey="probability"
                          name="Probabilidad"
                          type="number"
                          domain={[0, 1]}
                          tickFormatter={percent}
                        />
                        <YAxis domain={[0, 1]} tickFormatter={percent} />
                        <Tooltip formatter={(v) => percent(Number(v))} />
                        <Line
                          type="linear"
                          dataKey="probability"
                          name="Calibración perfecta"
                          stroke="#b5bdb6"
                          strokeDasharray="4 4"
                          dot={false}
                        />
                        <Line
                          type="linear"
                          dataKey="outcome"
                          name="Frecuencia observada"
                          stroke="#CC7722"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="small muted analytics-note">
                    Probabilidad estimada frente a frecuencia observada. Las
                    muestras pequeñas varían mucho; buscá patrones a lo largo
                    del tiempo.
                  </p>
                </>
              ) : (
                <div className="empty-state compact">
                  <Target size={26} />
                  <h3>Una imagen más clara lleva tiempo.</h3>
                  <p>
                    La calibración aparece con tu primer pronóstico resuelto.
                    Más resultados la vuelven más útil.
                  </p>
                </div>
              )}
            </div>
            <div className="panel topic-performance">
              <div className="panel-header">
                <h3>Tus temas de interés</h3>
              </div>
              {data.stats.categories.length ? (
                data.stats.categories.map((c) => (
                  <div
                    className="category-performance"
                    key={localLabel(c.category)}
                  >
                    <span>
                      {localLabel(c.category)}
                      <small>{c.count} resueltos</small>
                    </span>
                    <strong>{decimal(c.meanBrier)}</strong>
                  </div>
                ))
              ) : (
                <div className="empty-state compact">
                  <Globe2 size={26} />
                  <h3>Encontrá tus temas.</h3>
                  <p>
                    El rendimiento por tema aparece a medida que se resuelven
                    tus pronósticos.
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="section-title history-heading">
            <h2>Tu historial de pronósticos</h2>
            <span className="small muted">
              {history.length} pronóstico{history.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="panel forecast-history">
            {history.length ? (
              history.map((q) => (
                <button key={q.id} onClick={() => openQuestion(q)}>
                  <QuestionArt visual={q.visual} />
                  <div>
                    <strong>{q.title}</strong>
                    <span>
                      {dateLabel(q.forecast!.updatedAt)} ·{" "}
                      {q.forecast!.revisionCount}{" "}
                      {q.forecast!.revisionCount === 1
                        ? "versión"
                        : "versiones"}
                    </span>
                  </div>
                  <span className="history-status">
                    {q.status === "RESOLVED"
                      ? `Resultado: ${q.outcome === 1 ? "Sí" : "No"}`
                      : q.status === "VOID"
                        ? "Anulada"
                        : q.status === "CANCELLED"
                          ? "Cancelada"
                          : "Pendiente"}
                  </span>
                  <strong>{percent(q.forecast!.probability)}</strong>
                  <ArrowUpRight size={17} />
                </button>
              ))
            ) : (
              <div className="empty-state compact">
                <h3>Tu primer pronóstico es el comienzo.</h3>
                <p>Hay un mundo de preguntas esperando tu mirada.</p>
                <Button asChild variant="outline">
                  <Link href="/forecasts">
                    Encontrá tu primera pregunta <ArrowRight size={16} />
                  </Link>
                </Button>
              </div>
            )}
          </div>
          <div className="profile-bottom">
            <Link href="/proposals" className="text-button"><Plus size={16} /> Mis preguntas y plan</Link>
            {data.user.isAdmin && (
              <Link href="/admin" className="text-button">
                <Settings2 size={16} /> Gestión de preguntas
              </Link>
            )}
            <div>
              <ShieldCheck size={20} />
              <p>
                Solo los pronósticos resueltos definen tu puntaje.
                <br />
                Se conservan todas las versiones.
              </p>
            </div>
            <button
              className="text-button"
              onClick={async () => {
                try {
                  await api("auth", { action: "logout" });
                  if (data.user?.isRegistered || data.mode === "supabase")
                    window.location.assign("/login");
                  else await refresh();
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "No se pudo cerrar la sesión.",
                  );
                }
              }}
            >
              {data.mode === "demo" && !data.user.isRegistered
                ? "Empezar una nueva sesión de demo"
                : "Cerrar sesión"}{" "}
              <ArrowRight size={15} />
            </button>
          </div>
          {error && !edit && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
          <Dialog open={edit} onOpenChange={setEdit}>
            <DialogContent>
              <DialogTitle className="modal-title">Dale tu estilo.</DialogTitle>
              <DialogDescription>
                Tu nombre y región aparecen en la clasificación de las ligas.
              </DialogDescription>
              <form className="form-stack" onSubmit={save}>
                <label>
                  Nombre visible
                  <input
                    name="username"
                    defaultValue={data.user.username}
                    required
                    minLength={2}
                    maxLength={32}
                  />
                </label>
                <label>
                  País
                  <input
                    name="country"
                    defaultValue={localLabel(data.user.country)}
                    required
                    minLength={2}
                    maxLength={56}
                  />
                </label>
                {error && (
                  <p className="error-message" role="alert">
                    {error}
                  </p>
                )}
                <Button disabled={busy}>
                  {busy ? "Guardando…" : "Guardar perfil"}
                  <Check size={16} />
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
}
export function AdminView({ data, refresh }: RefreshProps) {
  const [participation, setParticipation] = useState<
    { questionId: string; participants: number; revisions: number }[]
  >([]);
  useEffect(() => {
    if (data.user?.isAdmin)
      api<{
        participation: {
          questionId: string;
          participants: number;
          revisions: number;
        }[];
      }>("admin/questions")
        .then((r) => setParticipation(r.participation))
        .catch(() => {});
  }, [data.questions, data.user?.isAdmin]);
  const [create, setCreate] = useState(false);
  const [editing, setEditing] = useState<QuestionView | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<{
    q: QuestionView;
    action: string;
    outcome?: number;
  } | null>(null);
  if (!data.user?.isAdmin)
    return (
      <div className="empty-state">
        <ShieldCheck size={30} />
        <h2>Esta es la gestión de preguntas.</h2>
        <p>Necesitás una cuenta administradora para gestionar preguntas.</p>
      </div>
    );
  async function action(q: QuestionView, act: string, outcome?: number) {
    setBusy(q.id);
    setError("");
    try {
      await api("admin/questions", { action: act, questionId: q.id, outcome });
      await refresh();
      setConfirm(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo realizar la acción.",
      );
    } finally {
      setBusy("");
    }
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("create");
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const question = {
        title: f.get("title"),
        description: f.get("description"),
        category: f.get("category"),
        horizon: f.get("horizon"),
        opensAt: new Date(String(f.get("opensAt"))).toISOString(),
        closesAt: new Date(String(f.get("closesAt"))).toISOString(),
        resolvesAt: new Date(String(f.get("resolvesAt"))).toISOString(),
        resolutionCriteria: f.get("resolutionCriteria"),
        sourceName: f.get("sourceName"),
        sourceUrl: f.get("sourceUrl"),
        visual: f.get("visual"),
      };
      await api("admin/questions", {
        action: editing ? "update" : "create",
        questionId: editing?.id,
        question,
      });
      await refresh();
      setCreate(false);
      setEditing(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la pregunta.",
      );
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="PANEL DE ADMINISTRACIÓN"
        title="Las buenas preguntas importan"
        description="Definí criterios claros, protegé el criterio independiente y resolvé con transparencia."
      >
        <Button
          onClick={() => {
            setEditing(null);
            setCreate(true);
            setError("");
          }}
        >
          <Plus size={16} /> Nueva pregunta
        </Button>
      </PageHeading>
      <div className="info-box">
        <ShieldCheck size={20} />
        <p>
          {data.mode === "demo"
            ? "Tenés acceso de administración en esta demo local."
            : ""}
          Los criterios publicados no se pueden modificar. Cerrá una pregunta
          antes de resolverla y anulá los resultados ambiguos.
        </p>
      </div>
      {error && !create && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <div className="admin-list">
        {data.questions.map((q) => (
          <article key={q.id}>
            <div className="admin-question">
              <QuestionArt visual={q.visual} />
              <div>
                <span className="eyebrow">
                  {localLabel(q.status)} · {localLabel(q.horizon)}
                </span>
                <h3>{q.title}</h3>
                <p>
                  Cierre {dateLabel(q.closesAt)}
                  {participation.find((p) => p.questionId === q.id)
                    ? ` · ${participation.find((p) => p.questionId === q.id)!.participants} participantes · ${participation.find((p) => p.questionId === q.id)!.revisions} versiones`
                    : ""}
                </p>
              </div>
            </div>
            <div className="admin-actions">
              {q.status === "DRAFT" ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(q);
                      setCreate(true);
                    }}
                  >
                    Editar borrador
                  </Button>
                  <Button
                    size="sm"
                    disabled={!!busy}
                    onClick={() => action(q, "publish")}
                  >
                    Publicar
                  </Button>
                </>
              ) : q.status === "PUBLISHED" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!busy}
                  onClick={() => setConfirm({ q, action: "close" })}
                >
                  Cerrar pronósticos
                </Button>
              ) : q.status === "CLOSED" ? (
                <>
                  <Button
                    size="sm"
                    onClick={() =>
                      setConfirm({ q, action: "resolve", outcome: 1 })
                    }
                  >
                    Resolver sí
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setConfirm({ q, action: "resolve", outcome: 0 })
                    }
                  >
                    Resolver no
                  </Button>
                </>
              ) : (
                <span className="pill">
                  {q.status === "RESOLVED"
                    ? `Resultado: ${q.outcome === 1 ? "Sí" : "No"}`
                    : localLabel(q.status)}
                </span>
              )}
              {["DRAFT", "PUBLISHED", "CLOSED"].includes(q.status) && (
                <button
                  className="text-button danger"
                  disabled={!!busy}
                  onClick={() => setConfirm({ q, action: "void" })}
                >
                  Anular
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      <Dialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <DialogContent>
          <DialogTitle className="modal-title">
            {confirm?.action === "resolve"
              ? `¿Resolver esta pregunta como ${confirm.outcome === 1 ? "Sí" : "No"}?`
              : confirm?.action === "void"
                ? "¿Anular esta pregunta?"
                : "¿Cerrar los pronósticos ahora?"}
          </DialogTitle>
          <DialogDescription>{confirm?.q.title}</DialogDescription>
          <div className="info-box">
            {confirm?.action === "resolve"
              ? "Se calcularán los puntajes con el último pronóstico válido de cada participante. Verificá la fuente y los criterios publicados antes de continuar."
              : confirm?.action === "void"
                ? "Esta pregunta dejará de puntuar. Los pronósticos existentes permanecerán en el historial de auditoría."
                : "Se cerrará el envío de pronósticos. Se conservarán los anteriores y el plazo original en el historial de auditoría."}
          </div>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <Button
            disabled={!!busy}
            onClick={() =>
              confirm && action(confirm.q, confirm.action, confirm.outcome)
            }
          >
            {busy ? "Aplicando…" : "Confirmar acción"}
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={create} onOpenChange={setCreate}>
        <DialogContent className="admin-dialog">
          <DialogTitle className="modal-title">
            {editing ? "Mejorá el borrador." : "Una pregunta que vale la pena."}
          </DialogTitle>
          <DialogDescription>
            Definí un resultado binario y objetivo antes de publicar.
          </DialogDescription>
          <form className="form-stack" onSubmit={save}>
            <label>
              Pregunta
              <input
                name="title"
                required
                minLength={10}
                maxLength={180}
                defaultValue={editing?.title}
              />
            </label>
            <label>
              Contexto
              <textarea
                name="description"
                required
                minLength={20}
                maxLength={3000}
                defaultValue={editing?.description}
              />
            </label>
            <div className="form-columns">
              <label>
                Tema
                <select name="category" defaultValue={editing?.category}>
                  {[
                    "Science & tech",
                    "Climate",
                    "World",
                    "Sports",
                    "Economy",
                  ].map((x) => (
                    <option key={x} value={x}>
                      {localLabel(x)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Plazo
                <select name="horizon" defaultValue={editing?.horizon}>
                  {["daily", "weekly", "monthly", "long-term"].map((x) => (
                    <option key={x} value={x}>
                      {localLabel(x)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-columns">
              {["opensAt", "closesAt", "resolvesAt"].map((field, i) => (
                <label key={field}>
                  {["Apertura", "Cierre", "Resolución"][i]}
                  <input
                    type="datetime-local"
                    name={field}
                    required
                    defaultValue={
                      editing
                        ? localDate(editing[field as "opensAt"])
                        : localDate(
                            new Date(
                              Date.now() + [0, 86400000, 172800000][i],
                            ).toISOString(),
                          )
                    }
                  />
                </label>
              ))}
            </div>
            <label>
              Criterios de resolución
              <textarea
                name="resolutionCriteria"
                required
                minLength={20}
                maxLength={3000}
                defaultValue={editing?.resolutionCriteria}
              />
            </label>
            <div className="form-columns">
              <label>
                Nombre de la fuente
                <input
                  name="sourceName"
                  required
                  defaultValue={editing?.sourceName}
                />
              </label>
              <label>
                URL de la fuente
                <input
                  name="sourceUrl"
                  type="url"
                  required
                  defaultValue={editing?.sourceUrl}
                />
              </label>
            </div>
            <label>
              Ilustración
              <select name="visual" defaultValue={editing?.visual}>
                {["space", "climate", "ai", "world", "sports", "economy"].map(
                  (x) => (
                    <option key={x} value={x}>
                      {localLabel(x)}
                    </option>
                  ),
                )}
              </select>
            </label>
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            <Button disabled={!!busy}>
              {busy ? "Guardando…" : "Guardar borrador"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
function localDate(value: string) {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
