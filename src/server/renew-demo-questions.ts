import { argentinaExamples } from "@/domain/argentina-examples";
import type { LocalData } from "./local-store";

/** Add a new simulated round only when its previous round is no longer open.
 * Never extend published deadlines or alter existing forecasts/results. */
export function renewDemoQuestions(data: LocalData, now: Date): boolean {
  let changed = false;
  for (const template of argentinaExamples(now)) {
    const rounds = data.questions.filter((q) => q.isDemo && (q.id === template.id || q.id.startsWith(`${template.id}-round-`)));
    if (rounds.some((q) => q.status === "PUBLISHED" && Date.parse(q.closesAt) > now.getTime())) continue;
    const id = `${template.id}-round-${now.getTime()}`;
    if (data.questions.some((q) => q.id === id)) continue;
    const edition = now.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
    data.questions.push({ ...template, id, description: `Ronda del ${edition}. ${template.description}` });
    changed = true;
  }
  return changed;
}
