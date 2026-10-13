"use client";
import { label as localLabel } from "@/lib/locale";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock3,
  EyeOff,
  History,
  Info,
  LoaderCircle,
  LockKeyhole,
  Send,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { QuestionView } from "@/domain/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { QuestionArt } from "./visuals";
import {
  api,
  dateLabel,
  percent,
  remaining,
  criterionDates,
} from "@/lib/utils";
export function ConsensusCharts({
  question,
  compact = false,
}: {
  question: QuestionView;
  compact?: boolean;
}) {
  const consensus = question.consensus;
  if (!consensus)
    return (
      <div className="consensus-locked">
        <LockKeyhole size={22} />
        <h3>Tu criterio va primero.</h3>
        <p>
          Hacé un pronóstico para descubrir qué piensa la comunidad. Pensar por
          tu cuenta hace la diferencia.
        </p>
      </div>
    );
  return (
    <div className="consensus-block">
      <div className="consensus-heading">
        <div>
          <span className="eyebrow">CONSENSO DE LA COMUNIDAD</span>
          <div className="consensus-value">
            {percent(consensus.probability)} <span>probabilidad de sí</span>
          </div>
        </div>
        <span className="muted small">
          {consensus.participants} participantes
          {question.isDemo && "· simulación"}
        </span>
      </div>
      <div className="consensus-bar">
        <span style={{ width: percent(consensus.probability) }} />
      </div>
      {!compact && (
        <>
          <h4>Cómo lo ve la comunidad</h4>
          <div
            className="chart"
            role="img"
            aria-label="Distribución de probabilidades de los pronósticos"
          >
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={consensus.distribution}
                margin={{ left: -27, right: 5, top: 10, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="#edf0eb" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Bar
                  dataKey="count"
                  name="Participantes"
                  fill="#CC7722"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {consensus.history.length > 1 && (
            <>
              <h4>Evolución del consenso</h4>
              <div
                className="chart"
                role="img"
                aria-label="Historial de la probabilidad de la comunidad"
              >
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart
                    data={consensus.history}
                    margin={{ left: -15, right: 8 }}
                  >
                    <CartesianGrid vertical={false} stroke="#edf0eb" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => dateLabel(v, true)}
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 1]}
                      tickFormatter={percent}
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      labelFormatter={(v) => dateLabel(String(v))}
                      formatter={(v) => percent(Number(v))}
                    />
                    <Area
                      type="stepAfter"
                      dataKey="probability"
                      name="Probabilidad"
                      stroke="#CC7722"
                      fill="#fff1e1"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
export function QuestionDetail({
  question,
  onClose,
  onSaved,
  loggedIn,
  onAuth,
  initialProbability,
}: {
  question: QuestionView;
  onClose: () => void;
  onSaved: () => Promise<void>;
  loggedIn: boolean;
  onAuth: () => void;
  initialProbability?: number;
}) {
  const [value, setValue] = useState(
    initialProbability ??
      (question.forecast
        ? Math.round(question.forecast.probability * 100)
        : 50),
  );
  const [reasoning, setReasoning] = useState(
    question.forecast?.reasoning ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const active =
    question.status === "PUBLISHED" &&
    new Date(question.opensAt).getTime() <= Date.now() &&
    new Date(question.closesAt).getTime() > Date.now();
  async function submit() {
    if (!loggedIn) {
      onAuth();
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("forecasts", {
        questionId: question.id,
        probability: value / 100,
        reasoning,
      });
      await onSaved();
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar el pronóstico.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="question-dialog">
        <div className="detail-top">
          <QuestionArt visual={question.visual} />
          <span className="eyebrow">{localLabel(question.category)}</span>
          <span className="pill">{localLabel(question.horizon)}</span>
        </div>
        <DialogTitle className="detail-title">{question.title}</DialogTitle>
        <DialogDescription className="detail-description">
          {question.description}
        </DialogDescription>
        {question.isDemo && (
          <div className="demo-inline">
            <Info size={14} /> Pregunta de ejemplo · pronósticos simulados
          </div>
        )}
        <div className="detail-dates">
          <span>
            <Clock3 size={15} /> Cierre de pronósticos{" "}
            <strong>{dateLabel(question.closesAt)}</strong>
          </span>
          <span>
            Resolución <strong>{dateLabel(question.resolvesAt, true)}</strong>
          </span>
        </div>
        <section className="forecast-editor">
          <div className="section-title">
            <h3>{question.forecast ? "Tu pronóstico" : "¿Qué pensás?"}</h3>
            <span className="muted small">
              {active
                ? remaining(question.closesAt)
                : question.status === "PUBLISHED"
                  ? Date.parse(question.opensAt) > Date.now()
                    ? "Aún no abrió"
                    : "Plazo finalizado"
                  : localLabel(question.status)}
            </span>
          </div>
          {saved && (
            <div className="success-message" role="status">
              <CheckCircle2 size={18} />
              <span>
                Pronóstico guardado. Tu perspectiva ya forma parte de la
                comunidad.
              </span>
            </div>
          )}
          <div className="probability-display">
            <strong>
              {value}
              <span>%</span>
            </strong>
            <span>
              probabilidad de <b>Sí</b>
            </span>
          </div>
          <label className="sr-only" htmlFor="detail-probability">
            Probabilidad de sí
          </label>
          <input
            id="detail-probability"
            className="probability-range"
            type="range"
            min="1"
            max="99"
            value={value}
            disabled={!active || busy}
            onChange={(e) => {
              setValue(Number(e.target.value));
              setSaved(false);
            }}
            style={{ "--range-progress": `${value}%` } as React.CSSProperties}
          />
          <div className="range-labels">
            <span>Muy poco probable</span>
            <span>Incierto</span>
            <span>Muy probable</span>
          </div>
          <div className="probability-presets">
            {[10, 25, 50, 75, 90].map((v) => (
              <button
                disabled={!active || busy}
                key={v}
                className={value === v ? "active" : ""}
                onClick={() => {
                  setValue(v);
                  setSaved(false);
                }}
              >
                {v}%
              </button>
            ))}
          </div>
          <label className="field-label" htmlFor="reasoning">
            Tu razonamiento <span>opcional</span>
          </label>
          <textarea
            id="reasoning"
            placeholder="¿En qué basás tu pronóstico?"
            maxLength={2000}
            value={reasoning}
            disabled={!active || busy}
            onChange={(e) => {
              setReasoning(e.target.value);
              setSaved(false);
            }}
            rows={3}
          />
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <Button
            className="submit-forecast"
            disabled={busy || !active || saved}
            onClick={submit}
          >
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : saved ? (
              <Check size={17} />
            ) : (
              <Send size={16} />
            )}{" "}
            {busy
              ? "Guardando pronóstico…"
              : saved
                ? "Pronóstico guardado"
                : !active
                  ? "Pronósticos cerrados"
                  : question.forecast
                    ? "Actualizar pronóstico"
                    : "Enviar pronóstico"}
          </Button>
          <p className="editor-note">
            {question.forecast ? (
              <>
                <History size={13} /> {question.forecast.revisionCount}{" "}
                {question.forecast.revisionCount === 1
                  ? "versión guardada"
                  : "versiones guardadas"}{" "}
                · Última actualización {dateLabel(question.forecast.updatedAt)}
              </>
            ) : (
              <>
                <EyeOff size={13} /> Los pronósticos de la comunidad se ocultan
                hasta que compartas el tuyo.
              </>
            )}
          </p>
        </section>
        <ConsensusCharts question={question} />
        <details className="resolution-details" open>
          <summary>
            Cómo se resuelve esta pregunta <Info size={16} />
          </summary>
          <p>{criterionDates(question.resolutionCriteria)}</p>
          <a href={question.sourceUrl} target="_blank" rel="noreferrer">
            {question.sourceName}
            <ArrowUpRight size={15} />
          </a>
          {question.outcome !== null && (
            <p className="outcome">
              Resultado: <strong>{question.outcome === 1 ? "Sí" : "No"}</strong>
            </p>
          )}
        </details>
        <p className="small muted">
          Podés cambiar tu pronóstico hasta el cierre. Guardamos todas las
          versiones; solo se puntúa la última válida.
        </p>
      </DialogContent>
    </Dialog>
  );
}
