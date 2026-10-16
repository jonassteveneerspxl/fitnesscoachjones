import { Workout, ExerciseLog, CoachResponse, SetLike, PRType } from "@/types/workout";
import { normalizeExerciseName } from "@/utils/exerciseNames";

// Epley formula for 1RM estimation
export function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export function calculateVolumeFromSets(sets: SetLike[]): number {
  return sets.reduce((total, set) => total + set.weight * set.reps, 0);
}

export function getBest1RMFromSets(sets: SetLike[]): number {
  if (sets.length === 0) return 0;
  return Math.max(...sets.map((set) => calculate1RM(set.weight, set.reps)));
}

export const PR_LABELS: Record<PRType, string> = {
  maxWeight: "Zwaarste set",
  bestSetVolume: "Beste setvolume",
  bestExerciseVolume: "Beste oefeningvolume",
  best1RM: "Geschatte 1RM",
};

export const PR_TYPES: PRType[] = ["maxWeight", "bestSetVolume", "bestExerciseVolume", "best1RM"];

/** Kerncijfers van één oefening in één sessie. Gewicht van één set en volume van de oefening zijn aparte grootheden. */
export interface ExerciseSessionStats {
  /** Hoogste gewicht in één set (kg). */
  maxWeight: number;
  /** Hoogste gewicht × reps in één set (kg). */
  bestSetVolume: number;
  /** Som van gewicht × reps over alle sets van de oefening (kg). */
  exerciseVolume: number;
  /** Hoogste geschatte 1RM (Epley). */
  best1RM: number;
  /** Hoogste aantal reps in één set. */
  maxReps: number;
  totalReps: number;
  setCount: number;
}

export function summarizeExerciseSets(sets: SetLike[]): ExerciseSessionStats {
  const valid = sets.filter(
    (s) => Number.isFinite(s.weight) && Number.isFinite(s.reps) && s.weight >= 0 && s.reps >= 1
  );
  return {
    maxWeight: valid.reduce((m, s) => Math.max(m, s.weight), 0),
    bestSetVolume: valid.reduce((m, s) => Math.max(m, s.weight * s.reps), 0),
    exerciseVolume: calculateVolumeFromSets(valid),
    best1RM: getBest1RMFromSets(valid),
    maxReps: valid.reduce((m, s) => Math.max(m, s.reps), 0),
    totalReps: valid.reduce((sum, s) => sum + s.reps, 0),
    setCount: valid.length,
  };
}

/** Beste eerdere waarde per recordtype voor een oefening, of `null` als de oefening nog nooit geregistreerd is. */
export function getPreviousBests(
  exercise: string,
  previousWorkouts: Workout[]
): Record<PRType, number> | null {
  const key = normalizeExerciseName(exercise);
  const previous = previousWorkouts
    .flatMap((w) => w.exercises)
    .filter((e) => normalizeExerciseName(e.exercise) === key)
    .map((e) => summarizeExerciseSets(e.sets))
    .filter((s) => s.setCount > 0);
  if (previous.length === 0) return null;
  return {
    maxWeight: Math.max(...previous.map((s) => s.maxWeight)),
    bestSetVolume: Math.max(...previous.map((s) => s.bestSetVolume)),
    bestExerciseVolume: Math.max(...previous.map((s) => s.exerciseVolume)),
    best1RM: Math.max(...previous.map((s) => s.best1RM)),
  };
}

/**
 * Welke persoonlijke records breekt deze registratie? Een eerste registratie van een oefening is een
 * uitgangspunt en telt NIET als record. Een record vereist een strikt hogere waarde dan alle eerdere
 * registraties van dezelfde (genormaliseerde) oefening en een waarde groter dan 0.
 */
export function detectPRs(
  sets: SetLike[],
  exercise: string,
  previousWorkouts: Workout[]
): { isFirstRecord: boolean; prTypes: PRType[] } {
  const current = summarizeExerciseSets(sets);
  if (current.setCount === 0) return { isFirstRecord: false, prTypes: [] };
  const best = getPreviousBests(exercise, previousWorkouts);
  if (!best) return { isFirstRecord: true, prTypes: [] };

  const values: Record<PRType, number> = {
    maxWeight: current.maxWeight,
    bestSetVolume: current.bestSetVolume,
    bestExerciseVolume: current.exerciseVolume,
    best1RM: current.best1RM,
  };
  return {
    isFirstRecord: false,
    prTypes: PR_TYPES.filter((t) => values[t] > 0 && values[t] > best[t]),
  };
}

export function checkForPR(
  exercise: string,
  sets: SetLike[],
  previousWorkouts: Workout[]
): boolean {
  return detectPRs(sets, exercise, previousWorkouts).prTypes.length > 0;
}

const prMessages = [
  "🔥 Nieuwe PR op {exercise}! Geweldig werk!",
  "💪 BOOM! Nieuw persoonlijk record op {exercise}!",
  "🏆 PR ALERT! {exercise} naar een nieuw niveau!",
  "⚡ Ongelooflijk! Je hebt jezelf overtroffen op {exercise}!",
];

const motivationalMessages = [
  "Goed bezig! Blijf consistent en die PR komt vanzelf.",
  "Sterke workout! Elke rep brengt je dichter bij je doel.",
  "Mooi werk! Je bouwt aan een sterker lichaam.",
  "Solide training vandaag!",
];

export function generateCoachResponse(
  exercises: ExerciseLog[],
  previousWorkouts: Workout[]
): CoachResponse {
  const exerciseResults = exercises.map((ex) => {
    const { isFirstRecord, prTypes } = detectPRs(ex.sets, ex.exercise, previousWorkouts);
    return {
      exercise: ex.exercise,
      volume: ex.volume,
      estimated1RM: ex.estimated1RM,
      newPR: prTypes.length > 0,
      prTypes,
      isFirstRecord,
    };
  });

  const totalVolume = exercises.reduce((sum, ex) => sum + ex.volume, 0);
  const hasPR = exerciseResults.some((r) => r.newPR);
  const firstTimers = exerciseResults.filter((r) => r.isFirstRecord);

  let message: string;
  if (hasPR) {
    const prExercises = exerciseResults.filter((r) => r.newPR);
    const randomPR = prMessages[Math.floor(Math.random() * prMessages.length)];
    message = randomPR.replace("{exercise}", prExercises[0].exercise);
    if (prExercises.length > 1) {
      message += ` En nog ${prExercises.length - 1} andere PR(s)!`;
    }
  } else if (firstTimers.length > 0) {
    message = `Eerste registratie van ${firstTimers[0].exercise}${
      firstTimers.length > 1 ? ` en ${firstTimers.length - 1} andere` : ""
    }: dit is je uitgangspunt om op voort te bouwen.`;
  } else {
    message =
      motivationalMessages[
        Math.floor(Math.random() * motivationalMessages.length)
      ];
  }

  return {
    message,
    exercises: exerciseResults,
    totalVolume,
  };
}
