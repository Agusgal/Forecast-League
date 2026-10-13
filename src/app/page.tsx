import Link from "next/link";
import {
  ArrowRight,
  Target,
  Trophy,
  Users,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "@/components/visuals";
import { LandingPreview } from "@/components/landing-preview";
export default function Page() {
  return (
    <div className="public-page">
      <header className="public-header">
        <Link href="/" aria-label="Inicio de Forecast League">
          <Brand />
        </Link>
        <nav aria-label="Navegación principal">
          <a href="#how-it-works" className="public-how">
            Cómo funciona
          </a>
          <Link href="/login">Iniciar sesión</Link>
          <Link href="/signup" className="solid-link">
            Sumate a la liga <ArrowRight size={17} />
          </Link>
        </nav>
      </header>
      <main>
        <section className="landing-hero">
          <div className="landing-copy">
            <span className="landing-kicker">
              <Zap size={16} fill="currentColor" /> OTRA FORMA DE MIRAR LO QUE
              VIENE
            </span>
            <h1>
              Grandes preguntas.
              <br />
              Tu pronóstico.
              <br />
              <em>A jugar.</em>
            </h1>
            <p>
              Convertí tu curiosidad en un hábito. Pronosticá qué va a pasar,
              desafiá a tus amigos y descubrí qué tan preciso es tu criterio.
            </p>
            <div className="landing-actions">
              <Link className="solid-link" href="/signup">
                Empezá a pronosticar <ArrowRight size={20} />
              </Link>
              <Link className="outline-link" href="/forecasts">
                Explorar la demo
              </Link>
            </div>
            <span className="landing-assurance">
              <ShieldCheck size={17} /> Sin apuestas. Solo criterio, curiosidad
              y un poco de competencia.
            </span>
          </div>
          <LandingPreview />
        </section>
        <section className="landing-how" id="how-it-works">
          <div className="landing-section-heading">
            <div>
              <span className="eyebrow">
                FÁCIL DE JUGAR. SIEMPRE ALGO PARA APRENDER.
              </span>
              <h2>Mirá el futuro con otros ojos.</h2>
            </div>
            <Link href="/forecasts">
              Encontrá tu próxima pregunta <ArrowRight size={18} />
            </Link>
          </div>
          <div className="landing-steps">
            {[
              {
                icon: Target,
                number: "01",
                title: "Hacé tu pronóstico.",
                text: "El resultado es sí o no. Tu pronóstico indica qué tan probable es: del 1 % al 99 %.",
              },
              {
                icon: Trophy,
                number: "02",
                title: "Construí tu historial.",
                text: "Cuando se resuelve una pregunta, tu precisión define tu puntaje. Aprendé de cada resultado y afiná tu criterio.",
              },
              {
                icon: Users,
                number: "03",
                title: "Encontrá tu liga.",
                text: "Creá una liga privada, invitá amigos con un código y comparen sus pronósticos sobre las mismas preguntas.",
              },
            ].map(({ icon: Icon, number, title, text }) => (
              <article key={number}>
                <div>
                  <Icon size={26} strokeWidth={1.6} />
                  <span>{number}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="landing-banner">
          <div>
            <span className="eyebrow">PENSAR POR TU CUENTA VALE</span>
            <h2>Tu perspectiva tiene lugar acá.</h2>
            <p>
              Hacé tu propio pronóstico antes de ver el consenso de la
              comunidad.
            </p>
          </div>
          <Link href="/signup" className="solid-link">
            Hacé tu primer pronóstico <ArrowRight size={19} />
          </Link>
        </section>
      </main>
      <footer className="public-footer">
        <Brand />
        <span>Seguí preguntando. Pensá en probabilidades.</span>
        <Link href="/forecasts">
          Explorar Forecast League <ArrowRight size={16} />
        </Link>
      </footer>
    </div>
  );
}
