"use client";
import { useState } from "react";
import { educationLevels, incomeCurrencies, sexes } from "@/domain/registration";

import { countryOptions as countries } from "@/domain/countries";

export function SignupDetails() {
  const [income, setIncome] = useState("");
  return <>
    <section className="registration-block" aria-labelledby="personal-heading">
      <h3 id="personal-heading"><span>02</span> Sobre vos</h3>
      <p>Completá estos datos obligatorios. Tu edad y residencia se registran tal como las indicás hoy.</p>
      <div className="registration-grid">
        <label>País de nacimiento *<select name="birthCountry" required defaultValue=""><option value="" disabled>Seleccioná un país</option>{countries.map(({code, name}) => <option key={code} value={code}>{name}</option>)}</select></label>
        <label>País de residencia *<select name="residenceCountry" required autoComplete="country" defaultValue=""><option value="" disabled>Seleccioná un país</option>{countries.map(({code, name}) => <option key={code} value={code}>{name}</option>)}</select></label>
        <label>Edad *<input name="age" type="number" inputMode="numeric" min={1} max={120} step={1} required placeholder="Años cumplidos" /></label>
        <label>Sexo *<select name="sex" required defaultValue=""><option value="" disabled>Seleccioná una opción</option>{Object.entries(sexes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
    </section>
    <details className="registration-optional">
      <summary>03 · Un poco más de contexto <span>Opcional</span></summary>
      <p>Podés omitir toda esta sección. Estos datos no afectan tus puntos ni tu posición.</p>
      <div className="registration-grid">
        <label>Nivel educativo alcanzado<select name="education" defaultValue=""><option value="">Sin completar</option>{Object.entries(educationLevels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Ocupación<input name="occupation" maxLength={100} placeholder="Ej.: estudiante" /></label>
        <label>Ciudad de residencia<input name="city" maxLength={100} autoComplete="address-level2" placeholder="Ej.: Córdoba" /></label>
        <label>Barrio de residencia<input name="neighborhood" maxLength={100} placeholder="Ej.: Nueva Córdoba" /></label>
        <label>Ingreso anual estimado<input name="annualIncome" type="number" min={0} max={1_000_000_000_000} step="0.01" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="Importe aproximado" /></label>
        <label>Moneda del ingreso<select name="incomeCurrency" required={income !== ""} defaultValue=""><option value="">Seleccioná una moneda</option>{incomeCurrencies.map((code) => <option key={code}>{code}</option>)}</select></label>
      </div>
      <p className="registration-hint">Estimá tu ingreso personal total en un año, no el de tu hogar. Si indicás un importe, elegí también la moneda.</p>
    </details>
    <p className="registration-privacy">Tu usuario será público. Los datos de este formulario sobre nacimiento, residencia, edad, sexo, educación e ingresos se guardan de forma privada y no se muestran en rankings ni a otros participantes. El país que elijas mostrar después en tu perfil público es independiente.</p>
  </>;
}
