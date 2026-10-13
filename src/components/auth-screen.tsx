"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ShieldCheck,
  Target,
  Trophy,
} from "lucide-react";
import type { Profile } from "@/domain/types";
import { api } from "@/lib/utils";
import { Brand } from "./visuals";
import { Button } from "./ui/button";

export function AuthForm({
  initialSignup,
  knownMode,
  onSuccess,
}: {
  initialSignup: boolean;
  knownMode?: "demo" | "supabase";
  onSuccess?: () => Promise<void>;
}) {
  const router = useRouter();
  const [signup, setSignup] = useState(initialSignup);
  const [mode, setMode] = useState(knownMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (knownMode) return;
    let active = true;
    setLoadError("");
    api<{ mode: "demo" | "supabase" }>("auth")
      .then((result) => {
        if (active) setMode(result.mode);
      })
      .catch((err) => {
        if (active) setLoadError(err.message);
      });
    return () => {
      active = false;
    };
  }, [knownMode, attempt]);
  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get("error") ===
      "confirmation"
    )
      setError(
        "No pudimos verificar ese enlace de confirmación. Intentá iniciar sesión o usá el último enlace que recibiste por correo.",
      );
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{ user: Profile | null; message?: string }>(
        "auth",
        {
          action: signup ? "signup" : "login",
          email: String(form.get("email")).trim(),
          password: form.get("password"),
          ...(signup ? { username: form.get("username") } : {}),
        },
      );
      if (result.user) {
        if (onSuccess) await onSuccess();
        else {
          router.replace("/forecasts");
          router.refresh();
        }
      } else
        setMessage(
          result.message ??
            "Revisá tu correo para confirmar tu cuenta y después iniciá sesión.",
        );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo iniciar sesión. Intentá de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="form-stack auth-form">
      {mode === "demo" && (
        <p className="auth-mode">
          <ShieldCheck size={17} /> Cuenta de demo local · guardada en esta
          computadora
        </p>
      )}
      {loadError && (
        <div className="error-message" role="alert">
          {loadError}
          <button
            type="button"
            className="text-button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Reintentar
          </button>
        </div>
      )}
      <fieldset disabled={busy || !mode || !!message}>
        {signup && (
          <label>
            Usuario
            <input
              name="username"
              required
              minLength={2}
              maxLength={32}
              autoComplete="nickname"
              placeholder="Tu nombre de usuario"
            />
          </label>
        )}
        <label>
          Correo electrónico
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            placeholder="vos@ejemplo.com"
          />
        </label>
        <label>
          Contraseña
          <input
            name="password"
            type="password"
            required
            minLength={signup ? 8 : 1}
            maxLength={128}
            autoComplete={signup ? "new-password" : "current-password"}
            placeholder={signup ? "Al menos 8 caracteres" : "Tu contraseña"}
          />
        </label>
        <Button type="submit" className="auth-submit">
          {busy
            ? "Un momento…"
            : !mode
              ? "Conectando…"
              : signup
                ? "Crear cuenta"
                : "Iniciar sesión"}
          <ArrowRight size={19} />
        </Button>
      </fieldset>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success-message" role="status">
          <Check size={20} /> {message}
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        className="text-button centered"
        onClick={() => {
          if (!onSuccess) {
            router.push(signup ? "/login" : "/signup");
            return;
          }
          setSignup(!signup);
          setError("");
          setMessage("");
        }}
      >
        {signup
          ? "¿Ya tenés cuenta? Iniciá sesión"
          : "¿Sos nuevo? Creá una cuenta"}
      </button>
    </form>
  );
}
export function AuthScreen({ signup = false }: { signup?: boolean }) {
  return (
    <div className="public-page auth-page">
      <header className="public-header">
        <Link href="/" aria-label="Inicio de Forecast League">
          <Brand />
        </Link>
        <Link href="/" className="text-button">
          <ArrowLeft size={17} /> Volver al inicio
        </Link>
      </header>
      <main className="auth-layout">
        <section className="auth-intro">
          <span className="landing-kicker">
            <Target size={17} /> TU PERSPECTIVA. TU PROGRESO.
          </span>
          <h1>
            Un poco de previsión.
            <br />
            <em>Un juego diferente.</em>
          </h1>
          <p>
            Poné a prueba tu criterio. Encontrá tu comunidad. Construí un
            historial del que puedas sentirte orgulloso.
          </p>
          <div className="auth-perks">
            <span>
              <Check /> Hacé tu propio pronóstico
            </span>
            <span>
              <Check /> Aprendé de cada resultado
            </span>
            <span>
              <Check /> Competí con amigos
            </span>
          </div>
          <div className="auth-trophy" aria-hidden="true">
            <Trophy size={76} strokeWidth={1.4} />
            <span>
              Un buen criterio
              <br />
              empieza con un pronóstico.
            </span>
          </div>
        </section>
        <section className="auth-card">
          <span className="eyebrow">EMPECEMOS</span>
          <h2>{signup ? "Sumate a la liga." : "Qué bueno verte."}</h2>
          <p>
            {signup
              ? "Tu primer pronóstico te espera."
              : "¿Listo para tu próximo pronóstico?"}
          </p>
          <AuthForm initialSignup={signup} />
          <Link href="/forecasts" className="auth-demo">
            ¿Solo querés mirar? Explorá la demo <ArrowRight size={16} />
          </Link>
        </section>
      </main>
    </div>
  );
}
