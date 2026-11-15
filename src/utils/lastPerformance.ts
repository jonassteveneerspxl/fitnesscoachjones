/**
 * "Vorige keer": de meest recente keer dat je een oefening hebt gedaan, zodat je bij het loggen meteen ziet
 * (en kunt overnemen) wat je toen deed en niet lager hoeft te beginnen.
 */
import { TrainingType, Workout } from "@/types/workout";
import { normalizeExerciseName } from "@/utils/exerciseNames";
import { summarizeExerciseSets } from "@/utils/fitnessCalculations";
import { parseInstant } from "@/utils/dates";
import { bestWorkSet } from "@/utils/statistics";

export interface LastPerformance {
  workoutId: string;
  startedAt: string;
  timeZone: string | null;
  sets: { weight: number; reps: number }[];
  /** Som van gewicht × reps. */
  volume: number;
  maxWeight: number;
}

/**
 * Zoekt de meest recente workout (op starttijd) met deze oefening en minstens één geldige set.
 * Workouts zonder geldige starttijd kunnen niet op volgorde gezet worden en worden overgeslagen.
 * `before` (ms) beperkt tot workouts vóór dat moment; `excludeId` slaat één workout over.
 */
export function findLastPerformance(
  workouts: Workout[],
  exerciseName: string,
  options: { excludeId?: string; before?: number } = {}
): LastPerformance | null {
  const key = normalizeExerciseName(exerciseName);
  if (!key) return null;

  let best: { ms: number; workout: Workout; sets: LastPerformance["sets"] } | null = null;
  for (const workout of workouts) {
    if (workout.id === options.excludeId) continue;
    const instant = parseInstant(workout.startedAt);
    if (!instant) continue;
    const ms = instant.getTime();
    if (options.before !== undefined && ms >= options.before) continue;
    if (best && ms <= best.ms) continue;

    const log = workout.exercises.find((e) => normalizeExerciseName(e.exercise) === key);
    if (!log) continue;
    const sets = [...log.sets]
      .sort((a, b) => a.setNumber - b.setNumber)
      .filter((s) => Number.isFinite(s.weight) && Number.isFinite(s.reps) && s.weight >= 0 && s.reps >= 1)
      .map((s) => ({ weight: s.weight, reps: s.reps }));
    if (sets.length === 0) continue;
    best = { ms, workout, sets };
  }
  if (!best) return null;

  const stats = summarizeExerciseSets(best.sets);
  return {
    workoutId: best.workout.id,
    startedAt: best.workout.startedAt as string,
    timeZone: best.workout.timeZone,
    sets: best.sets,
    volume: stats.exerciseVolume,
    maxWeight: stats.maxWeight,
  };
}

/**
 * De meest recente workout (op starttijd) met minstens één oefening, eventueel van een bepaald trainingstype.
 * Zonder type of voor "Custom"/"Onbekend" telt elke workout.
 */
export function findLastWorkout(workouts: Workout[], trainingType?: TrainingType | null): Workout | null {
  const anyType = !trainingType || trainingType === "Custom" || trainingType === "Onbekend";
  let best: { ms: number; workout: Workout } | null = null;
  for (const workout of workouts) {
    if (!anyType && workout.trainingType !== trainingType) continue;
    if (workout.exercises.length === 0) continue;
    const instant = parseInstant(workout.startedAt);
    if (!instant) continue;
    if (!best || instant.getTime() > best.ms) best = { ms: instant.getTime(), workout };
  }
  return best?.workout ?? null;
}

export const REP_CEILING = 12;
export const WEIGHT_STEP_KG = 2.5;

export interface NextTarget {
  weight: number;
  reps: number;
  /** "reps": één rep meer; "weight": bovenkant van het herhalingsbereik bereikt, dus iets zwaarder. */
  kind: "reps" | "weight";
}

/**
 * Een voorstel voor deze keer, gebaseerd op je beste werkset van vorige keer: eerst één rep meer, en pas als je
 * al op {@link REP_CEILING} herhalingen zat iets zwaarder met minder reps. Alleen een suggestie, geen opdracht.
 */
export function suggestNextTarget(last: LastPerformance): NextTarget | null {
  const best = bestWorkSet(last.sets);
  if (!best || best.weight <= 0) return null;
  if (best.reps >= REP_CEILING) {
    return { weight: Math.round((best.weight + WEIGHT_STEP_KG) * 10) / 10, reps: Math.max(6, REP_CEILING - 4), kind: "weight" };
  }
  return { weight: best.weight, reps: best.reps + 1, kind: "reps" };
}
