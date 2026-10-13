import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}
export function dateLabel(value: string, short = false) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Cordoba",
    month: "short",
    day: "numeric",
    ...(short
      ? {}
      : { year: "numeric", hour: "numeric", minute: "2-digit", hour12: false }),
  }).format(new Date(value));
}
export function remaining(value: string) {
  const hours = Math.max(0, (new Date(value).getTime() - Date.now()) / 3600000);
  return hours === 0
    ? "Cerrado"
    : hours < 1
      ? `Quedan ${Math.ceil(hours * 60)} min`
      : hours < 24
        ? `Quedan ${Math.ceil(hours)} h`
        : `Quedan ${Math.ceil(hours / 24)} días`;
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Algo salió mal. Intentá de nuevo.");
  return data as T;
}

/** Render immutable ISO criteria timestamps in Argentina time without editing stored terms. */
export function criterionDates(value: string) {
  return value.replace(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g,
    (timestamp) => `${dateLabel(timestamp)} (hora argentina)`,
  );
}
