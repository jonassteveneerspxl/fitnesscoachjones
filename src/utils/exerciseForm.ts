import type { CardioActivity, CardioData, ExerciseKind, SetData } from "@/types/workout";
import { parseDuration } from "@/utils/cardio";

/** Formuliertekst van een tijdset (plank, deadhang): duur en optioneel extra gewicht. */
export interface TimeSetForm {
  weight: string;
  duration?: string;
  done?: boolean;
}

export interface CardioForm {
  activity: CardioActivity;
  /** Kilometer, mag leeg. Komma of punt. */
  distance: string;
  /** "mm:ss", "u:mm:ss" of een kaal aantal minuten. */
  duration: string;
}

export const emptyCardio = (): CardioForm => ({ activity: "Lopen", distance: "", duration: "" });

const num = (t: string) => Number(t.trim().replace(",", "."));

export const isTimeSetFilled = (s: TimeSetForm) => (s.duration ?? "").trim() !== "" || s.weight.trim() !== "";

export function isTimeSetValid(s: TimeSetForm): boolean {
  if (parseDuration(s.duration ?? "", "seconds") === null) return false;
  if (s.weight.trim() === "") return true; // geen extra gewicht
  const w = num(s.weight);
  return Number.isFinite(w) && w >= 0;
}

/** Alleen afgevinkte, geldige sets; een leeg gewicht wordt 0. */
export function buildTimeSets(sets: TimeSetForm[]): SetData[] {
  return sets
    .filter((s) => s.done !== false && isTimeSetValid(s))
    .map((s, i) => ({
      setNumber: i + 1,
      weight: s.weight.trim() === "" ? 0 : num(s.weight),
      reps: 0,
      durationSeconds: parseDuration(s.duration ?? "", "seconds") as number,
    }));
}

export const isCardioFilled = (c: CardioForm) => c.distance.trim() !== "" || c.duration.trim() !== "";

export function isCardioValid(c: CardioForm): boolean {
  if (parseDuration(c.duration, "minutes") === null) return false;
  if (c.distance.trim() === "") return true;
  const d = num(c.distance);
  return Number.isFinite(d) && d > 0;
}

export function buildCardio(c: CardioForm): CardioData {
  return {
    activity: c.activity,
    distanceKm: c.distance.trim() === "" ? 0 : Math.round(num(c.distance) * 100) / 100,
    durationSeconds: parseDuration(c.duration, "minutes") as number,
  };
}

/** Voorstel voor het soort oefening op basis van de naam; de gebruiker kan het altijd aanpassen. */
export function suggestKind(name: string): ExerciseKind {
  return /\b(plank|planken|dead ?hang|hollow (hold|body)|wall sit|l-?sit)\b/i.test(name) ? "time" : "strength";
}
