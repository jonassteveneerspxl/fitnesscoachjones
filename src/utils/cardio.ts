import type { CardioData, ExerciseKind, ExerciseLog } from "@/types/workout";

export const exerciseKindOf = (ex: Pick<ExerciseLog, "kind">): ExerciseKind => ex.kind ?? "strength";

/**
 * Leest een duur. "1:30" = 1 min 30 s, "1:02:03" = 1 u 2 min 3 s, een kaal getal gebruikt `bareUnit`
 * (seconden bij tijdoefeningen, minuten bij cardio). Geeft `null` bij ongeldige of lege invoer.
 */
export function parseDuration(text: string, bareUnit: "seconds" | "minutes"): number | null {
  const t = text.trim().replace(",", ".");
  if (t === "") return null;
  if (!t.includes(":")) {
    const n = Number(t);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(bareUnit === "minutes" ? n * 60 : n);
  }
  const parts = t.split(":");
  if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const nums = parts.map(Number);
  const [h, m, s] = parts.length === 3 ? nums : [0, nums[0], nums[1]];
  if (s >= 60 || (parts.length === 3 && m >= 60)) return null;
  const total = h * 3600 + m * 60 + s;
  return total > 0 ? total : null;
}

/** 90 → "1:30", 3723 → "1:02:03". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Tempo in seconden per km, of null zonder afstand. */
export function paceSecondsPerKm(c: Pick<CardioData, "distanceKm" | "durationSeconds">): number | null {
  return c.distanceKm > 0 ? c.durationSeconds / c.distanceKm : null;
}

export function formatPace(c: Pick<CardioData, "distanceKm" | "durationSeconds">): string | null {
  const p = paceSecondsPerKm(c);
  return p === null ? null : `${formatDuration(p)}/km`;
}

export function speedKmh(c: Pick<CardioData, "distanceKm" | "durationSeconds">): number | null {
  return c.distanceKm > 0 ? Math.round((c.distanceKm / (c.durationSeconds / 3600)) * 10) / 10 : null;
}

const km = (n: number) => `${n.toLocaleString("nl-BE", { maximumFractionDigits: 2 })} km`;

/** "1:00" of "1:00 + 10 kg". */
export function describeTimeSet(set: { weight: number; durationSeconds?: number }): string {
  const t = formatDuration(set.durationSeconds ?? 0);
  return set.weight > 0 ? `${t} + ${set.weight.toLocaleString("nl-BE", { maximumFractionDigits: 1 })} kg` : t;
}

/** "10 km · 50:00 · 5:00/km"; afstand en tempo ontbreken als er geen afstand is ingevuld. */
export function describeCardio(c: CardioData): string {
  return [c.distanceKm > 0 ? km(c.distanceKm) : null, formatDuration(c.durationSeconds), formatPace(c)].filter(Boolean).join(" · ");
}

/** Korte blokjes voor een tijd- of cardio-oefening in lijsten; `null` voor krachtoefeningen. */
export function describeNonStrength(ex: Pick<ExerciseLog, "kind" | "cardio" | "sets">): string[] | null {
  if (ex.kind === "cardio" && ex.cardio) return [describeCardio(ex.cardio)];
  if (ex.kind === "time") return ex.sets.map(describeTimeSet);
  return null;
}
