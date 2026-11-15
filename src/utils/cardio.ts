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
