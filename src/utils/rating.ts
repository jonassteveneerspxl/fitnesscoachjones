import type { Session } from "@/utils/statistics";
import { addDaysToDateKey, toIsoWeekKey } from "@/utils/dates";

export const RATING_MIN = 1;
export const RATING_MAX = 10;

/** Een geldige beoordeling is een geheel getal van 1 tot en met 10. */
export const isValidRating = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= RATING_MIN && v <= RATING_MAX;

export function ratingEmoji(rating: number): string {
  if (rating <= 2) return "😫";
  if (rating <= 4) return "😕";
  if (rating <= 6) return "😐";
  if (rating <= 8) return "🙂";
  return "😄";
}

export function ratingLabel(rating: number): string {
  if (rating <= 2) return "Zware dag";
  if (rating <= 4) return "Moeizaam";
  if (rating <= 6) return "Oké";
  if (rating <= 8) return "Goed";
  return "Topdag";
}

/** Van rood (1) via geel naar groen (10), als hsl-kleur. */
export function ratingColor(rating: number): string {
  const t = (Math.min(RATING_MAX, Math.max(RATING_MIN, rating)) - RATING_MIN) / (RATING_MAX - RATING_MIN);
  return `hsl(${Math.round(t * 120)} 70% 50%)`;
}

export interface RatingPoint {
  dateKey: string;
  rating: number;
}

export interface RatingStats {
  /** Gemiddelde van deze en vorige week, of `null` zonder beoordelingen in die week. */
  thisWeekAvg: number | null;
  lastWeekAvg: number | null;
  /** Totaal aantal beoordeelde trainingen. */
  rated: number;
  /** De laatste beoordeelde trainingen, oudste eerst. */
  points: RatingPoint[];
}

const avg = (xs: number[]): number | null => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

/** Beoordelingen per week en het verloop over de laatste `limit` beoordeelde trainingen. */
export function ratingStats(sessions: Session[], todayKey: string, limit = 20): RatingStats {
  const rated = sessions
    .filter((s) => isValidRating(s.workout.rating))
    .sort((a, b) => a.instantMs - b.instantMs);
  const thisKey = toIsoWeekKey(todayKey);
  const lastKey = toIsoWeekKey(addDaysToDateKey(todayKey, -7));
  const inWeek = (key: string) => rated.filter((s) => s.weekKey === key).map((s) => s.workout.rating as number);
  return {
    thisWeekAvg: avg(inWeek(thisKey)),
    lastWeekAvg: avg(inWeek(lastKey)),
    rated: rated.length,
    points: rated.slice(-limit).map((s) => ({ dateKey: s.dateKey, rating: s.workout.rating as number })),
  };
}
