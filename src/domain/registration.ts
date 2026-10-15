import { z } from "zod";

import { countryOptions } from "./countries";

export const countryCodes: string[] = countryOptions.map(({ code }) => code);
export const sexes = { female: "Femenino", male: "Masculino", intersex: "Intersexual", other: "Otro", undisclosed: "Prefiero no decirlo" };
export const educationLevels = { primary: "Primario", secondary: "Secundario", tertiary: "Terciario", university: "Universitario", postgraduate: "Posgrado", other: "Otro / sin estudios formales" };
export const incomeCurrencies = ["ARS", "USD", "EUR", "BRL", "CLP", "UYU", "GBP"] as const;
const country = z.string().refine((value) => countryCodes.includes(value), "Elegí un país de la lista.");
const optionalText = z.string().trim().min(1).max(100).optional();
export const personalDataSchema = z.object({
  birthCountry: country,
  residenceCountry: country,
  age: z.number().int().min(1).max(120),
  sex: z.enum(["female", "male", "intersex", "other", "undisclosed"]),
  education: z.enum(["primary", "secondary", "tertiary", "university", "postgraduate", "other"]).optional(),
  city: optionalText,
  neighborhood: optionalText,
  occupation: optionalText,
  annualIncome: z.number().finite().min(0).max(1_000_000_000_000).optional(),
  incomeCurrency: z.enum(incomeCurrencies).optional(),
}).strict().refine((value) => (value.annualIncome === undefined) === (value.incomeCurrency === undefined), {
  path: ["incomeCurrency"], message: "Completá el ingreso anual y su moneda, o dejá ambos vacíos.",
});
export type PersonalData = z.infer<typeof personalDataSchema>;
