/**
 * Concept van de workout die je nu invult.
 *
 * Probleem dat dit oplost: het formulier hield alles in het geheugen van de pagina. Als de browser de tab
 * opruimt of herlaadt (op een telefoon tijdens een training gebeurt dat), was alles wat nog niet was opgeslagen weg.
 * Het concept wordt daarom bij elke wijziging weggeschreven en bij het openen van het formulier teruggezet.
 *
 * Bewust apart van de workoutopslag (`workoutStorage.ts`): een concept is tijdelijk, wordt nooit meegeteld in
 * statistieken en raakt de opgeslagen workouts niet aan. Alle functies gooien nooit een fout; opslag die niet
 * beschikbaar of vol is, betekent alleen dat er geen concept bewaard wordt.
 */
import { SELECTABLE_TRAINING_TYPES, TrainingType } from "@/types/workout";
import type { StorageLike } from "@/utils/workoutStorage";

export const DRAFT_KEY = "fitness-coach-draft-v1";
export const DRAFT_VERSION = 1;

const MAX_EXERCISES = 50;
const MAX_SETS = 50;
const MAX_TEXT = 5000;

export interface DraftSet {
  weight: string;
  reps: string;
}

export interface DraftExercise {
  exercise: string;
  sets: DraftSet[];
  notes: string;
  isExpanded: boolean;
}

export interface WorkoutDraft {
  version: typeof DRAFT_VERSION;
  /** ISO-instant van de laatste wijziging. */
  savedAt: string;
  trainingType: TrainingType;
  exercises: DraftExercise[];
}

export type SaveDraftResult = "saved" | "cleared" | "error";

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isText = (v: unknown): v is string => typeof v === "string" && v.length <= MAX_TEXT;

/** Een formulier zonder enige invoer is geen concept: er valt niets te bewaren. */
export function isDraftEmpty(exercises: DraftExercise[]): boolean {
  return exercises.every(
    (ex) =>
      ex.exercise.trim() === "" &&
      ex.notes.trim() === "" &&
      ex.sets.every((s) => s.weight.trim() === "" && s.reps.trim() === "")
  );
}

function parseExercise(raw: unknown): DraftExercise | null {
  if (!isRecord(raw) || !isText(raw.exercise) || !Array.isArray(raw.sets)) return null;
  if (raw.sets.length < 1 || raw.sets.length > MAX_SETS) return null;
  const sets: DraftSet[] = [];
  for (const s of raw.sets) {
    if (!isRecord(s) || !isText(s.weight) || !isText(s.reps)) return null;
    sets.push({ weight: s.weight, reps: s.reps });
  }
  return {
    exercise: raw.exercise,
    sets,
    // Een te lange notitie wordt ingekort in plaats van het hele concept te weigeren: de sets gaan voor.
    notes: typeof raw.notes === "string" ? raw.notes.slice(0, MAX_TEXT) : "",
    isExpanded: typeof raw.isExpanded === "boolean" ? raw.isExpanded : true,
  };
}

/** Leest en valideert het concept. Onleesbare of ongeldige inhoud geeft `null` (en verandert niets in de opslag). */
export function loadDraft(storage: StorageLike | null): WorkoutDraft | null {
  if (!storage) return null;
  let text: string | null;
  try {
    text = storage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
  if (!text) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.version !== DRAFT_VERSION) return null;
  if (!Array.isArray(parsed.exercises) || parsed.exercises.length < 1 || parsed.exercises.length > MAX_EXERCISES) {
    return null;
  }
  const exercises: DraftExercise[] = [];
  for (const raw of parsed.exercises) {
    const ex = parseExercise(raw);
    if (!ex) return null;
    exercises.push(ex);
  }
  if (isDraftEmpty(exercises)) return null;

  const trainingType = SELECTABLE_TRAINING_TYPES.includes(parsed.trainingType as TrainingType)
    ? (parsed.trainingType as TrainingType)
    : "Custom";
  const savedAt =
    typeof parsed.savedAt === "string" && !Number.isNaN(new Date(parsed.savedAt).getTime())
      ? parsed.savedAt
      : new Date().toISOString();

  return { version: DRAFT_VERSION, savedAt, trainingType, exercises };
}

/**
 * Schrijft het concept weg. Een leeg formulier wist het concept juist, zodat na een geslaagde opslag of na
 * weggooien niets achterblijft.
 */
export function saveDraft(
  storage: StorageLike | null,
  exercises: DraftExercise[],
  trainingType: TrainingType,
  now: Date = new Date()
): SaveDraftResult {
  if (!storage) return "error";
  try {
    if (isDraftEmpty(exercises)) {
      storage.removeItem(DRAFT_KEY);
      return "cleared";
    }
    const draft: WorkoutDraft = {
      version: DRAFT_VERSION,
      savedAt: now.toISOString(),
      trainingType,
      exercises: exercises.map((ex) => ({
        exercise: ex.exercise,
        sets: ex.sets.map((s) => ({ weight: s.weight, reps: s.reps })),
        notes: ex.notes,
        isExpanded: ex.isExpanded,
      })),
    };
    storage.setItem(DRAFT_KEY, JSON.stringify(draft));
    return "saved";
  } catch {
    return "error";
  }
}

export function clearDraft(storage: StorageLike | null): void {
  if (!storage) return;
  try {
    storage.removeItem(DRAFT_KEY);
  } catch {
    // Niets te doen: zonder toegankelijke opslag is er ook geen concept.
  }
}
