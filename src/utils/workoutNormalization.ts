import {
  ExerciseLog,
  SetData,
  TRAINING_TYPES,
  TrainingType,
  Workout,
  WorkoutLog,
} from "@/types/workout";
import { calculateVolumeFromSets, getBest1RMFromSets } from "@/utils/fitnessCalculations";
import { getDeviceTimeZone, isValidTimeZone, parseInstant, toDateKey } from "@/utils/dates";
import { generateId } from "@/utils/ids";

export interface NormalizeResult {
  workout: Workout | null;
  /** Menselijk leesbare opmerkingen over dingen die niet (volledig) overgenomen konden worden. */
  issues: string[];
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Herberekent alle afgeleide velden uit de sets. */
export function withDerivedTotals(workout: Workout): Workout {
  const exercises = workout.exercises.map((ex) => ({
    ...ex,
    volume: calculateVolumeFromSets(ex.sets),
    estimated1RM: getBest1RMFromSets(ex.sets),
  }));
  return {
    ...workout,
    exercises,
    totalVolume: exercises.reduce((sum, ex) => sum + ex.volume, 0),
  };
}

function normalizeSets(raw: unknown, label: string, issues: string[]): SetData[] {
  if (!Array.isArray(raw)) {
    issues.push(`${label}: sets ontbreken of zijn ongeldig`);
    return [];
  }
  const sets: SetData[] = [];
  const used = new Set<number>();
  raw.forEach((s, index) => {
    if (!isRecord(s) || !isFiniteNumber(s.weight) || s.weight < 0 || !isFiniteNumber(s.reps) || !Number.isInteger(s.reps) || s.reps < 1) {
      issues.push(`${label}: set ${index + 1} is ongeldig en is overgeslagen`);
      return;
    }
    let setNumber = index + 1;
    if (isFiniteNumber(s.setNumber) && Number.isInteger(s.setNumber) && s.setNumber >= 1 && !used.has(s.setNumber)) {
      setNumber = s.setNumber;
    } else {
      while (used.has(setNumber)) setNumber++;
    }
    used.add(setNumber);
    sets.push({ setNumber, weight: s.weight, reps: s.reps });
  });
  return sets;
}

function normalizeExercises(raw: unknown, issues: string[]): ExerciseLog[] | null {
  if (!Array.isArray(raw)) return null;
  const exercises: ExerciseLog[] = [];
  raw.forEach((ex, index) => {
    if (!isRecord(ex) || typeof ex.exercise !== "string" || ex.exercise.trim() === "") {
      issues.push(`oefening ${index + 1} heeft geen geldige naam en is overgeslagen`);
      return;
    }
    const name = ex.exercise.trim();
    const sets = normalizeSets(ex.sets, name, issues);
    exercises.push({
      exercise: name,
      sets,
      notes: typeof ex.notes === "string" && ex.notes !== "" ? ex.notes : undefined,
      volume: 0,
      estimated1RM: 0,
    });
  });
  return exercises;
}

/**
 * Zet een willekeurige (opgeslagen/geïmporteerde) waarde om naar een geldige `Workout`.
 * Ontbrekende tijdzone of datum blijft `null`; er wordt nooit iets verzonnen.
 * Afgeleide velden (volume, 1RM, totaal) worden herberekend uit de sets.
 */
export function normalizeWorkout(raw: unknown): NormalizeResult {
  const issues: string[] = [];
  if (!isRecord(raw)) return { workout: null, issues: ["geen geldig workout-object"] };

  const exercises = normalizeExercises(raw.exercises, issues);
  if (!exercises) return { workout: null, issues: [...issues, "workout heeft geen oefeningenlijst"] };
  if (exercises.length === 0 && Array.isArray(raw.exercises) && raw.exercises.length > 0) {
    return { workout: null, issues: [...issues, "geen enkele oefening in de workout is geldig"] };
  }

  let id = typeof raw.id === "string" && raw.id.trim() !== "" ? raw.id : "";
  if (!id) {
    id = generateId();
    issues.push("workout had geen id; er is een nieuw id toegekend");
  }

  const instant = parseInstant(raw.startedAt) ?? parseInstant(raw.date);
  const startedAt = instant ? instant.toISOString() : null;
  if (!instant) issues.push("workout heeft geen geldige datum");
  const rawDate = typeof raw.date === "string" ? raw.date : "";

  const trainingType: TrainingType = (TRAINING_TYPES as readonly unknown[]).includes(raw.trainingType)
    ? (raw.trainingType as TrainingType)
    : "Onbekend";

  const workout: Workout = withDerivedTotals({
    id,
    userId: typeof raw.userId === "string" && raw.userId !== "" ? raw.userId : "user-1",
    date: startedAt ?? rawDate,
    startedAt,
    timeZone: isValidTimeZone(raw.timeZone) ? raw.timeZone : null,
    trainingType,
    exercises,
    totalVolume: 0,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
  });

  return { workout, issues };
}

/**
 * Migreert het oorspronkelijke formaat (één log per oefening) naar workouts.
 * Logs van dezelfde kalenderdag (in `timeZone`, standaard die van het toestel) worden samengevoegd, zoals
 * de oorspronkelijke app deed; er is geen sessie-informatie om beter te groeperen. Logs zonder geldige
 * datum worden nooit samengevoegd. Het starttijdstip is het vroegste log van de dag.
 */
export function migrateLegacyLogs(
  logs: unknown[],
  timeZone: string = getDeviceTimeZone()
): NormalizeResult[] {
  const groups = new Map<string, { raw: WorkoutLog; instant: Date | null }[]>();
  logs.forEach((raw, index) => {
    const log = raw as WorkoutLog;
    const instant = isRecord(raw) ? parseInstant(log.date) : null;
    const key = instant ? `day:${toDateKey(instant, timeZone)}` : `nodate:${index}`;
    const list = groups.get(key) ?? [];
    list.push({ raw: log, instant });
    groups.set(key, list);
  });

  const usedIds = new Set<string>();
  const results: NormalizeResult[] = [];
  for (const entries of groups.values()) {
    const issues: string[] = [];
    const sorted = [...entries].sort(
      (a, b) => (a.instant?.getTime() ?? Infinity) - (b.instant?.getTime() ?? Infinity)
    );
    const exercises = sorted
      .filter((e) => isRecord(e.raw) && typeof e.raw.exercise === "string" && e.raw.exercise.trim() !== "")
      .map((e) => ({
        exercise: e.raw.exercise,
        sets: e.raw.sets,
        notes: e.raw.notes,
      }));
    if (exercises.length === 0) {
      results.push({ workout: null, issues: ["log heeft geen geldige oefening en is overgeslagen"] });
      continue;
    }
    const first = (sorted.find((e) => isRecord(e.raw))?.raw ?? {}) as Partial<WorkoutLog>;
    let id = typeof first.id === "string" && first.id !== "" ? first.id : "";
    if (!id || usedIds.has(id)) id = generateId();
    usedIds.add(id);

    const result = normalizeWorkout({
      id,
      userId: first.userId,
      date: first.date,
      startedAt: sorted.find((e) => isRecord(e.raw))?.instant?.toISOString(),
      trainingType: "Onbekend",
      exercises,
    });
    result.issues.unshift(...issues);
    results.push(result);
  }
  return results;
}

/** Herkent of een ruwe array het oorspronkelijke log-formaat, het v1-workoutformaat of een mix bevat. */
export function splitLegacyAndWorkouts(items: unknown[]): { workouts: unknown[]; logs: unknown[] } {
  const workouts: unknown[] = [];
  const logs: unknown[] = [];
  for (const item of items) {
    if (isRecord(item) && Array.isArray(item.exercises)) workouts.push(item);
    else logs.push(item);
  }
  return { workouts, logs };
}
