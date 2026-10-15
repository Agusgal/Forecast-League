"use client";
import { label as localLabel } from "@/lib/locale";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Compass,
  Globe2,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  Flame,
  Zap,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Plus,
  Building2,
  X,
} from "lucide-react";
import type { Bootstrap, Horizon, QuestionView } from "@/domain/types";
import { api, dateLabel, percent, remaining } from "@/lib/utils";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import { Avatar, Brand, ForecastArenaArt, QuestionArt } from "./visuals";
import { AuthForm } from "./auth-screen";
import { QuestionDetail } from "./question-detail";
import { WorkspaceView } from "./workspace-view";
import {
  AdminView,
  LeaguesView,
  LeaderboardView,
  ProfileView,
  WorldView,
} from "./views";
const navigation = [
  { path: "/forecasts", label: "Pronósticos", icon: Compass },
  { path: "/leagues", label: "Mis ligas", icon: Users },
  { path: "/leaderboard", label: "Clasificación", icon: Trophy },
  { path: "/world", label: "Consenso mundial", icon: Globe2 },
  { path: "/profile", label: "Mi perfil", icon: Target },
];
const workspaceNavigation = [
  { path: "/proposals", label: "Crear preguntas", icon: Plus, section: "questions" },
  { path: "/communities", label: "Comunidades", icon: Users, section: "communities" },
  { path: "/plans", label: "Planes", icon: Sparkles, section: "plans" },
  { path: "/enterprise", label: "Enterprise", icon: Building2, section: "enterprise" },
  { path: "/moderation", label: "Revisión y planes", icon: ShieldCheck, section: "moderation" },
] as const;
const horizons: { id: Horizon; label: string; sub: string }[] = [
  {
    id: "daily",
    label: "Diario",
    sub: "Un poco de previsión, todos los días.",
  },
  { id: "weekly", label: "Semanal", sub: "Anticipá lo que viene esta semana." },
  { id: "monthly", label: "Mensual", sub: "Pensá un poco más allá." },
  {
    id: "long-term",
    label: "Largo plazo",
    sub: "La mirada a futuro empieza acá.",
  },
];
export function ForecastApp() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [error, setError] = useState("");
  const [horizon, setHorizon] = useState<Horizon>("daily");
  const [category, setCategory] = useState("Todos los temas");
  const [search, setSearch] = useState("");
  const [includeClosed, setIncludeClosed] = useState(false);
  const [auth, setAuth] = useState(false);
  const [help, setHelp] = useState(false);
  const [initials, setInitials] = useState<Record<string, number>>({});
  const pathname = usePathname();
  const router = useRouter();
  const refresh = useCallback(async () => {
    const next = await api<Bootstrap>("bootstrap");
    setData(next);
    setError("");
  }, []);
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [refresh]);
  const isQuestion = pathname.startsWith("/questions/");
  const activePath = isQuestion ? "/forecasts" : pathname;
  const currentQuestion = data?.questions.find(
    (q) => q.id === decodeURIComponent(pathname.split("/")[2] ?? ""),
  );
  const openQuestion = (q: QuestionView, value?: number) => {
    setInitials((p) => {
      const next = { ...p };
      if (value !== undefined) next[q.id] = value;
      else delete next[q.id];
      return next;
    });
    router.push(`/questions/${q.id}`, { scroll: false });
  };
  const user = data?.user;
  const daily =
    data?.questions.filter(
      (q) =>
        q.horizon === "daily" &&
        q.status === "PUBLISHED" &&
        Date.parse(q.opensAt) <= Date.now() &&
        Date.parse(q.closesAt) > Date.now(),
    ) ?? [];
  const dailyDone = daily.filter((q) => q.forecast).length;
  const title =
    navigation.find((n) => n.path === activePath)?.label ??
    workspaceNavigation.find((n) => n.path === activePath)?.label ??
    (activePath === "/admin" ? "Gestión de preguntas" : "Pronósticos");
  const workspaceSection = workspaceNavigation.find((n) => n.path === activePath)?.section;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <aside className="sidebar">
        <Link href="/" aria-label="Inicio de Forecast League">
          <Brand />
        </Link>
        <div className="sidebar-label">MIRÁ MÁS ALLÁ</div>
        <nav className="desktop-nav">
          {navigation.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              href={path}
              className={activePath === path ? "nav-item active" : "nav-item"}
            >
              <Icon size={20} strokeWidth={1.65} />
              <span>{label}</span>
              {path === "/leagues" && !!data?.leagues.length && (
                <span className="nav-count">{data.leagues.length}</span>
              )}
            </Link>
          ))}
          <span className="workspace-nav-divider">TU PARTICIPACIÓN</span>
          {workspaceNavigation.filter((item) => item.section !== "moderation" || (user?.isAdmin && user?.isRegistered)).map(({ path, label, icon: Icon }) => (
            <Link key={path} href={path} className={activePath === path ? "nav-item active" : "nav-item"}>
              <Icon size={20} strokeWidth={1.65} /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="little-star">✳</span>
            <h3>
              Buen criterio.
              <br />
              Gran compañía.
            </h3>
            <p>El futuro es más interesante entre todos.</p>
            <Link href="/leagues">
              Encontrá tu comunidad <ArrowUpRight size={15} />
            </Link>
          </div>
          <button className="nav-item help-link" onClick={() => setHelp(true)}>
            <CircleHelp size={19} /> Cómo funciona
          </button>
          {user?.isAdmin && (
            <Link className="nav-item help-link" href="/admin">
              <Settings2 size={18} /> Gestión de preguntas
            </Link>
          )}
          <button
            className="sidebar-user"
            onClick={() => (user ? router.push("/profile") : setAuth(true))}
          >
            <Avatar name={user?.username ?? "Visitante"} />
            <span>
              <strong>{user?.username ?? "Sumate a la liga"}</strong>
              <small>
                {data?.mode === "demo"
                  ? "Explorando la demo"
                  : "Tu camino como pronosticador"}
              </small>
            </span>
            <ArrowUpRight size={16} />
          </button>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div className="mobile-brand">
            <Link href="/" aria-label="Inicio de Forecast League">
              <Brand />
            </Link>
          </div>
          <span className="breadcrumb">
            Forecast League <span>/</span> <strong>{title}</strong>
          </span>
          <div className="topbar-right">
            {!user?.isRegistered && (
              <Link href="/signup" className="account-cta">
                Crear cuenta <ArrowRight size={16} />
              </Link>
            )}
            <span
              className={`environment-badge ${data?.mode === "supabase" ? "connected" : ""}`}
            >
              <span />
              {data?.mode === "supabase" ? "Plataforma conectada" : "Modo demo"}
            </span>
            <button
              className="topbar-avatar"
              aria-label={user ? "Abrir perfil" : "Iniciar sesión"}
              onClick={() => (user ? router.push("/profile") : setAuth(true))}
            >
              <Avatar name={user?.username ?? "Vos"} small />
            </button>
          </div>
        </header>
        <main className="main-content" id="main-content">
          {!data ? (
            error ? (
              <div className="empty-state">
                <h2>No pudimos cargar tus preguntas.</h2>
                <p>{error}</p>
                <Button
                  onClick={() => refresh().catch((e) => setError(e.message))}
                >
                  Reintentar
                </Button>
              </div>
            ) : (
              <div className="loading-state">
                <LoaderCircle className="spin" />
                <p>Estamos preparando una nueva perspectiva…</p>
              </div>
            )
          ) : (
            <>
              {activePath === "/forecasts" ? (
                <>
                  <div className="page-heading">
                    <div>
                      <div className="eyebrow">
                        {new Intl.DateTimeFormat("es-AR", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        }).format(new Date())}
                      </div>
                      <h1>
                        Pronosticá. Competí. Repetí<span>.</span>
                      </h1>
                      <p>
                        Grandes preguntas. Tus pronósticos. Una mejor mirada al
                        futuro.
                      </p>
                    </div>
                    <div className="forecast-heading-actions">
                    <Button asChild><Link href="/proposals"><Plus size={17} /> Agregar pregunta</Link></Button>
                    <button
                      className="text-button heading-help"
                      onClick={() => setHelp(true)}
                    >
                      Cómo jugar <CircleHelp size={16} />
                    </button>
                    </div>
                  </div>
                  <div className="home-layout">
                    <section className="feed-column">
                      <div className="hero">
                        <div className="hero-copy">
                          <span className="hero-kicker">
                            <Zap size={15} /> TU DESAFÍO DIARIO
                          </span>
                          <h2>
                            El futuro es
                            <br />
                            tu próxima jugada.
                          </h2>
                          <p>
                            Elegí una probabilidad. Registrá tu criterio.
                            <br /> Aprendé cada vez que el mundo dé una
                            respuesta.
                          </p>
                          <button
                            onClick={() =>
                              document
                                .getElementById("forecast-feed")
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                })
                            }
                          >
                            Hacé tu próximo pronóstico <ArrowRight size={18} />
                          </button>
                        </div>
                        <ForecastArenaArt
                          completed={dailyDone}
                          total={daily.length}
                        />
                      </div>
                      <div
                        className="horizon-tabs"
                        id="forecast-feed"
                        role="tablist"
                        aria-label="Plazo del pronóstico"
                      >
                        {horizons.map((h) => (
                          <button
                            key={h.id}
                            role="tab"
                            aria-selected={horizon === h.id}
                            onClick={() => setHorizon(h.id)}
                            className={horizon === h.id ? "active" : ""}
                          >
                            {h.label}
                            {h.id === "daily" && <span className="tab-dot" />}
                          </button>
                        ))}
                      </div>
                      <div className="feed-controls">
                        <div>
                          <h2>
                            {horizon === "long-term"
                              ? "A largo plazo"
                              : {
                                  daily: "Preguntas del día",
                                  weekly: "Preguntas de la semana",
                                  monthly: "Preguntas del mes",
                                  "long-term": "A largo plazo",
                                }[horizon]}
                          </h2>
                          <p>{horizons.find((h) => h.id === horizon)?.sub}</p>
                        </div>
                        <div className="topic-select">
                          <label className="sr-only" htmlFor="topic">
                            Filtrar por tema
                          </label>
                          <select
                            id="topic"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                          >
                            {[
                              "Todos los temas",
                              "Science & tech",
                              "Climate",
                              "World",
                              "Sports",
                              "Economy",
                            ].map((c) => (
                              <option key={c} value={c}>
                                {localLabel(c)}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={14} />
                        </div>
                      </div>
                      <div className="feed-search">
                        <Search size={16} />
                        <input
                          aria-label="Buscar preguntas"
                          placeholder="Buscar preguntas"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                          <button
                            aria-label="Borrar búsqueda"
                            onClick={() => setSearch("")}
                          >
                            <X size={15} />
                          </button>
                        )}
                      </div>
                      <label className="archive-toggle"><input type="checkbox" checked={includeClosed} onChange={(event) => setIncludeClosed(event.target.checked)} /> Incluir preguntas cerradas e historial</label>
                      <div className="question-grid">
                        {data.questions
                          .slice()
                          .sort(
                            (a, b) =>
                              Number(
                                b.status === "PUBLISHED" &&
                                  Date.parse(b.opensAt) <= Date.now() &&
                                  Date.parse(b.closesAt) > Date.now(),
                              ) -
                                Number(
                                  a.status === "PUBLISHED" &&
                                    Date.parse(a.opensAt) <= Date.now() &&
                                    Date.parse(a.closesAt) > Date.now(),
                                ) ||
                              Number(b.id.startsWith("demo-ar-")) -
                                Number(a.id.startsWith("demo-ar-")),
                          )
                          .filter(
                            (q) =>
                              q.status !== "DRAFT" &&
                              (includeClosed || (q.status === "PUBLISHED" && Date.parse(q.opensAt) <= Date.now() && Date.parse(q.closesAt) > Date.now())) &&
                              q.horizon === horizon &&
                              (category === "Todos los temas" ||
                                q.category === category) &&
                              q.title
                                .toLowerCase()
                                .includes(search.toLowerCase()),
                          )
                          .map((q) => (
                            <QuestionCard
                              key={q.id}
                              question={q}
                              onOpen={openQuestion}
                            />
                          ))}
                      </div>
                      {!data.questions.some(
                        (q) =>
                          q.status !== "DRAFT" &&
                              (includeClosed || (q.status === "PUBLISHED" && Date.parse(q.opensAt) <= Date.now() && Date.parse(q.closesAt) > Date.now())) &&
                          q.horizon === horizon &&
                          (category === "Todos los temas" ||
                            q.category === category) &&
                          q.title.toLowerCase().includes(search.toLowerCase()),
                      ) && (
                        <div className="empty-state compact">
                          <Search />
                          <h3>Todavía no hay preguntas en esta vista.</h3>
                          <p>Probá con otro tema o búsqueda.</p>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setCategory("Todos los temas");
                              setSearch("");
                            }}
                          >
                            Restablecer filtros
                          </Button>
                        </div>
                      )}
                      <div className="feed-footnote">
                        <ShieldCheck size={16} />
                        <p>
                          Primero, tu criterio. El consenso se revela después de
                          tu pronóstico.
                        </p>
                      </div>
                    </section>
                    <aside className="right-column">
                      <div className="daily-card">
                        <div className="daily-card-top">
                          <span className="eyebrow">DESAFÍO DIARIO</span>
                          <span className="daily-spark">
                            <Flame size={20} />
                          </span>
                        </div>
                        <h3>
                          Hacé tus pronósticos.
                          <br />
                          Completá el desafío diario.
                        </h3>
                        <div className="daily-progress-label">
                          <strong>
                            {dailyDone}
                            <span> / {daily.length}</span>
                          </strong>
                          <span>pronósticos realizados</span>
                        </div>
                        <div className="daily-segments">
                          {daily.map((q) => (
                            <span
                              key={q.id}
                              className={q.forecast ? "filled" : ""}
                            >
                              {q.forecast && <Check size={13} />}
                            </span>
                          ))}
                        </div>
                        <p>
                          {dailyDone === daily.length && daily.length > 0
                            ? "Ya compartiste tu perspectiva de hoy. ¡Bien hecho!"
                            : "Seguí así. Tu próxima pregunta te espera."}
                        </p>
                      </div>
                      <div className="journey-card">
                        <div className="section-title">
                          <h3>Tu puntaje</h3>
                          <Target size={18} />
                        </div>
                        <div className="rating-value">
                          {data.stats.meanBrier === null
                            ? "—"
                            : Math.round((1 - data.stats.meanBrier) * 1000)}
                          <span>Puntaje provisional</span>
                        </div>
                        <div className="journey-stats">
                          <div>
                            <strong>{data.stats.forecastCount}</strong>
                            <span>Pronósticos</span>
                          </div>
                          <div>
                            <strong>{data.stats.resolvedCount}</strong>
                            <span>Resueltas</span>
                          </div>
                        </div>
                        <p>
                          {data.stats.resolvedCount
                            ? "Solo cuentan las preguntas resueltas. La precisión vale más que la cantidad."
                            : "Tu puntaje empieza con tu primer pronóstico resuelto."}
                        </p>
                        <Link href="/profile">
                          Ver tu progreso <ArrowUpRight size={15} />
                        </Link>
                      </div>
                      <div className="friends-card">
                        <div className="friend-avatars">
                          <Avatar name="Vos" small />
                          <span>
                            <Users size={18} />
                          </span>
                          <span>+</span>
                        </div>
                        <h3>Tus amigos. Tu liga.</h3>
                        <p>
                          Empezá una competencia amistosa.
                          <br />
                          Creá una liga e invitá a tus amigos.
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => router.push("/leagues")}
                        >
                          Encontrá tu liga <ArrowRight size={15} />
                        </Button>
                      </div>
                      <div className="small-manifesto">
                        <span>SIN APUESTAS. CON PERSPECTIVA.</span>
                        <p>La curiosidad es el único requisito.</p>
                      </div>
                    </aside>
                  </div>
                </>
              ) : workspaceSection ? (
                <WorkspaceView key={workspaceSection} data={data} refresh={refresh} section={workspaceSection} />
              ) : activePath === "/leagues" ? (
                <LeaguesView
                  data={data}
                  refresh={refresh}
                  onAuth={() => setAuth(true)}
                />
              ) : activePath === "/leaderboard" ? (
                <LeaderboardView data={data} />
              ) : activePath === "/world" ? (
                <WorldView data={data} openQuestion={openQuestion} />
              ) : activePath === "/profile" ? (
                <ProfileView
                  data={data}
                  refresh={refresh}
                  onAuth={() => setAuth(true)}
                  openQuestion={openQuestion}
                />
              ) : activePath === "/admin" ? (
                <AdminView data={data} refresh={refresh} />
              ) : (
                <div className="empty-state">
                  <h1>Territorio por descubrir.</h1>
                  <Link href="/forecasts">Volver a los pronósticos</Link>
                </div>
              )}
              <footer className="app-footer">
                <span>FORECAST LEAGUE</span>
                <span>
                  {data.mode === "demo"
                    ? "Demo local · preguntas y datos de comunidad simulados"
                    : "Pensá por tu cuenta. Aprendé en comunidad."}
                </span>
              </footer>
            </>
          )}
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Navegación principal">
        {navigation.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            href={path}
            className={activePath === path ? "active" : ""}
          >
            <Icon size={21} strokeWidth={activePath === path ? 2 : 1.7} />
            <span>
              {label === "Consenso mundial"
                ? "Mundo"
                : label === "Mi perfil"
                  ? "Perfil"
                  : label === "Mis ligas"
                    ? "Ligas"
                    : label === "Clasificación"
                      ? "Posiciones"
                      : label}
            </span>
          </Link>
        ))}
      </nav>
      {currentQuestion && (
        <QuestionDetail
          key={currentQuestion.id}
          question={currentQuestion}
          onClose={() => router.push("/forecasts")}
          onSaved={async () => {
            await refresh();
            setInitials({});
          }}
          loggedIn={!!user}
          onAuth={() => setAuth(true)}
          initialProbability={initials[currentQuestion.id]}
        />
      )}{" "}
      {isQuestion && data && !currentQuestion && (
        <Dialog open onOpenChange={() => router.push("/forecasts")}>
          <DialogContent>
            <DialogTitle>Pregunta no encontrada</DialogTitle>
            <DialogDescription>
              Es posible que esta pregunta ya no esté disponible.
            </DialogDescription>
            <Button onClick={() => router.push("/forecasts")}>
              Volver a las preguntas
            </Button>
          </DialogContent>
        </Dialog>
      )}
      {auth && (
        <AuthDialog
          mode={data?.mode ?? "demo"}
          onClose={() => setAuth(false)}
          onSaved={refresh}
        />
      )}
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent>
          <span className="modal-symbol">
            <Compass size={25} />
          </span>
          <DialogTitle className="modal-title">
            Un buen pronóstico empieza con curiosidad.
          </DialogTitle>
          <DialogDescription>
            Tres pasos para afinar tu criterio.
          </DialogDescription>
          <div className="how-steps">
            <div>
              <span>01</span>
              <div>
                <h3>Hacé tu propio pronóstico</h3>
                <p>
                  Leé la pregunta y sus criterios de resolución. Elegí una
                  probabilidad entre el 1 % y el 99 %.
                </p>
              </div>
            </div>
            <div>
              <span>02</span>
              <div>
                <h3>Ampliá tu mirada</h3>
                <p>
                  Enviá tu pronóstico para ver el consenso. ¿Cambiaste de
                  opinión? Podés modificarlo hasta el cierre.
                </p>
              </div>
            </div>
            <div>
              <span>03</span>
              <div>
                <h3>Aprendé con cada resultado</h3>
                <p>
                  Las preguntas resueltas reciben un puntaje de Brier:
                  (probabilidad − resultado)². Cuanto menor, mejor. Tus puntos
                  son 1.000 × (1 − Brier promedio); la cantidad por sí sola no
                  suma.
                </p>
              </div>
            </div>
          </div>
          <div className="info-box">
            Sin dinero, apuestas ni activos negociables. Solo tu criterio, cada
            vez más afinado.
          </div>
          <Button onClick={() => setHelp(false)}>
            Miremos hacia adelante <ArrowRight size={16} />
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function QuestionCard({
  question: q,
  onOpen,
}: {
  question: QuestionView;
  onOpen: (q: QuestionView, value?: number) => void;
}) {
  const [value, setValue] = useState(
    q.forecast ? Math.round(q.forecast.probability * 100) : 50,
  );
  useEffect(() => {
    if (q.forecast) setValue(Math.round(q.forecast.probability * 100));
  }, [q.forecast?.probability]);
  const active =
    q.status === "PUBLISHED" &&
    new Date(q.opensAt).getTime() <= Date.now() &&
    new Date(q.closesAt).getTime() > Date.now();
  return (
    <article className={`question-card ${q.forecast ? "has-forecast" : ""}`}>
      <div className="question-card-top">
        <span className={`category-chip category-${q.visual}`}>
          {localLabel(q.category)}
        </span>
        <span className="time-left">
          {q.status === "RESOLVED" ? "Resuelta" : remaining(q.closesAt)}
        </span>
      </div>
      <div className="question-heading">
        <button onClick={() => onOpen(q, value)}>
          <h3>{q.title}</h3>
        </button>
        <QuestionArt visual={q.visual} />
      </div>
      <div className="question-meta">
        <span>
          {q.horizon === "daily"
            ? "Una pregunta para hoy"
            : `Resolución: ${dateLabel(q.resolvesAt, true)}`}
        </span>
        {q.isDemo && <span className="demo-dot">Ejemplo</span>}
      </div>
      <div className="card-forecast">
        <div className="card-probability">
          <span>
            {q.forecast
              ? "Tu pronóstico"
              : !active
                ? "Resultado"
                : "Probabilidad de sí"}
          </span>
          <strong>
            {!active && !q.forecast ? (
              q.outcome === null ? (
                "—"
              ) : q.outcome === 1 ? (
                "Sí"
              ) : (
                "No"
              )
            ) : (
              <>
                {value}
                <span>%</span>
              </>
            )}
          </strong>
        </div>
        {active && (
          <div
            className="outcome-choices"
            aria-label="Opciones rápidas de probabilidad"
          >
            <button
              type="button"
              aria-label="Me inclino por sí: establecer un 75 por ciento"
              aria-pressed={value > 50}
              className={`outcome-yes ${value > 50 ? "selected" : ""}`}
              onClick={() => setValue(75)}
            >
              <Check size={16} /> Me inclino por sí
            </button>
            <button
              type="button"
              aria-label="Me inclino por no: establecer un 25 por ciento"
              aria-pressed={value < 50}
              className={`outcome-no ${value < 50 ? "selected" : ""}`}
              onClick={() => setValue(25)}
            >
              <X size={16} /> Me inclino por no
            </button>
          </div>
        )}
        <input
          className="probability-range small-range"
          aria-label={`Probabilidad para ${q.title}`}
          type="range"
          min="1"
          max="99"
          value={value}
          disabled={!active}
          onChange={(e) => setValue(Number(e.target.value))}
          style={{ "--range-progress": `${value}%` } as React.CSSProperties}
        />
        <div className="card-range-labels">
          <span>1 % Sí</span>
          <span>99 % Sí</span>
        </div>
      </div>
      <div className="question-card-bottom">
        <span className="consensus-hint">
          {q.consensus ? (
            <>
              <span className="consensus-dot" />
              {percent(q.consensus.probability)} comunidad
            </>
          ) : (
            <>
              <LockKeyhole size={13} /> Consenso oculto
            </>
          )}
        </span>
        <button
          className={`forecast-link ${q.forecast ? "saved" : ""}`}
          onClick={() => onOpen(q, value)}
        >
          {q.forecast ? (
            <>
              <Check size={15} /> Tu pronóstico
            </>
          ) : (
            <>
              {active
                ? "Hacer un pronóstico"
                : q.status === "RESOLVED"
                  ? "Ver resultado"
                  : "Ver pregunta"}{" "}
              <ArrowUpRight size={16} />
            </>
          )}
        </button>
      </div>
    </article>
  );
}
function AuthDialog({
  mode,
  onClose,
  onSaved,
}: {
  mode: "demo" | "supabase";
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogTitle className="modal-title">
          Tu próxima etapa empieza acá.
        </DialogTitle>
        <DialogDescription>
          Iniciá sesión para guardar tu historial de pronósticos.
        </DialogDescription>
        <AuthForm
          initialSignup={false}
          knownMode={mode}
          onSuccess={async () => {
            await onSaved();
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
