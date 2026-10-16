import type { ExerciseLog, SetData, TrainingType, Workout } from "@/types/workout";
import { calculateVolumeFromSets, getBest1RMFromSets } from "@/utils/fitnessCalculations";

export const makeSets = (...pairs: [number, number][]): SetData[] =>
  pairs.map(([weight, reps], i) => ({ setNumber: i + 1, weight, reps }));

export const makeExercise = (name: string, pairs: [number, number][]): ExerciseLog => {
  const sets = makeSets(...pairs);
  return {
    exercise: name,
    sets,
    volume: calculateVolumeFromSets(sets),
    estimated1RM: getBest1RMFromSets(sets),
  };
};

export const makeWorkout = (
  over: Partial<Workout> & { exercises?: ExerciseLog[] } = {}
): Workout => {
  const exercises = over.exercises ?? [makeExercise("Bench Press", [[80, 5], [80, 4]])];
  const startedAt = over.startedAt === undefined ? "2026-03-10T12:00:00.000Z" : over.startedAt;
  return {
    id: "w1",
    userId: "user-1",
    date: startedAt ?? "",
    startedAt,
    timeZone: "Europe/Brussels",
    trainingType: "Push" as TrainingType,
    totalVolume: exercises.reduce((sum, e) => sum + e.volume, 0),
    ...over,
    exercises,
  };
};

/** In-memory vervanger voor localStorage, optioneel met een quota-fout. */
export class MemoryStorage {
  private data = new Map<string, string>();
  failWrites = false;
  getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new DOMException("quota", "QuotaExceededError");
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  keys() {
    return [...this.data.keys()];
  }
}
