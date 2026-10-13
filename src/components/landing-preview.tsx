"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Sun, X } from "lucide-react";
export function LandingPreview() {
  const [value, setValue] = useState(65);
  return (
    <div className="landing-preview-wrap">
      <span className="preview-note">
        Una gran pregunta. Tu mejor pronóstico.
      </span>
      <div className="landing-preview">
        <div className="preview-top">
          <span className="category-chip">Clima</span>
          <span className="eyebrow">PREGUNTA DE EJEMPLO</span>
        </div>
        <div className="preview-icon">
          <Sun size={36} strokeWidth={1.5} />
        </div>
        <h2>¿Superará Córdoba los 30 °C durante la próxima jornada?</h2>
        <div className="preview-probability">
          <span>Tu probabilidad de sí</span>
          <strong>
            {value}
            <small>%</small>
          </strong>
        </div>
        <div className="outcome-choices">
          <button
            className={`outcome-yes ${value > 50 ? "selected" : ""}`}
            aria-pressed={value > 50}
            onClick={() => setValue(75)}
          >
            <Check size={18} /> Me inclino por sí
          </button>
          <button
            className={`outcome-no ${value < 50 ? "selected" : ""}`}
            aria-pressed={value < 50}
            onClick={() => setValue(25)}
          >
            <X size={18} /> Me inclino por no
          </button>
        </div>
        <label className="sr-only" htmlFor="example-probability">
          Probabilidad de sí del ejemplo
        </label>
        <input
          id="example-probability"
          type="range"
          className="probability-range"
          min={1}
          max={99}
          value={value}
          onChange={(event) => setValue(Number(event.target.value))}
          style={{ "--range-progress": `${value}%` } as React.CSSProperties}
        />
        <div className="preview-range">
          <span>Poco probable</span>
          <span>Muy probable</span>
        </div>
        <Link href="/signup" className="solid-link">
          Hacé tu primer pronóstico <ArrowUpRight size={20} />
        </Link>
        <p>Probá el control. Este ejemplo no se guarda.</p>
      </div>
      <span className="preview-footnote">
        <Check size={17} /> Primero tu criterio. Después, la comunidad.
      </span>
    </div>
  );
}
