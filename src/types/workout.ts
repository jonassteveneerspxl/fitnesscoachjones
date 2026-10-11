export const TRAINING_TYPES = [
  "Push",
  "Pull",
  "Legs",
  "Upper",
  "Lower",
  "Full Body",
  "Custom",
  "Onbekend",
] as const;

export type TrainingType = (typeof TRAINING_TYPES)[number];

/** Types die de gebruiker voor een nieuwe workout kan kiezen ("Onbekend" is gereserveerd voor bestaande data). */
export const SELECTABLE_TRAINING_TYPES: TrainingType[] = TRAINING_TYPES.filter(
  (t) => t !== "Onbekend"
);

/** Minimale vorm van een set; genoeg voor berekeningen. */
export interface SetLike {
  weight: number;
  reps: number;
}

export interface SetData extends SetLike {
  /** 1-gebaseerd volgnummer binnen de oefening. */
  setNumber: number;
}

export interface ExerciseLog {
  exercise: string;
  sets: SetData[];
  notes?: string;
  /** Afgeleid: som van gewicht × reps. Wordt bij laden altijd herberekend uit de sets. */
  volume: number;
  /** Afgeleid: beste geschatte 1RM (Epley). Wordt bij laden altijd herberekend. */
  estimated1RM: number;
}

export interface Workout {
  id: string;
  userId: string;
  /**
   * Compatibiliteitsveld uit de oorspronkelijke app. Gelijk aan `startedAt` als die geldig is,
   * anders de oorspronkelijke (mogelijk ongeldige) waarde.
   */
  date: string;
  /** Moment waarop de workout is opgeslagen, als UTC-instant (ISO 8601). `null` = onbekend/ongeldig. */
  startedAt: string | null;
  /** IANA-tijdzone van het toestel op het moment van loggen. `null` = onbekend (bestaande data). */
  timeZone: string | null;
  trainingType: TrainingType;
  exercises: ExerciseLog[];
  /** Afgeleid: som van het volume van alle oefeningen. */
  totalVolume: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Een verwijderde workout, tijdelijk bewaard zodat verwijderen ongedaan gemaakt kan worden. */
export interface TrashedWorkout {
  workout: Workout;
  deletedAt: string;
}

/** Oorspronkelijk formaat: één log per oefening. Alleen nog nodig voor migratie. */
export interface WorkoutLog {
  id: string;
  userId: string;
  exercise: string;
  sets: SetLike[];
  date: string;
  notes?: string;
  volume: number;
  estimated1RM: number;
}

export type PRType = "maxWeight" | "bestSetVolume" | "bestExerciseVolume" | "best1RM";

export interface CoachResponse {
  message: string;
  exercises: {
    exercise: string;
    volume: number;
    estimated1RM: number;
    newPR: boolean;
    /** Welke soorten records gebroken zijn (leeg als er geen vorige registratie is of niets verbeterd is). */
    prTypes: PRType[];
    /** Eerste registratie van deze oefening: telt niet als record. */
    isFirstRecord: boolean;
  }[];
  totalVolume: number;
}
