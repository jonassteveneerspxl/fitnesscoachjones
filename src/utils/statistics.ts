/**
 * Pure berekeningen voor de statistiekenpagina. Alles wordt herberekend uit de opgeslagen sets (de afgeleide
 * velden `volume`/`estimated1RM`/`totalVolume` worden niet vertrouwd). Ontbrekende gegevens worden nooit
 * ingevuld: workouts zonder geldige datum doen niet mee aan tijdreeksen en workouts zonder geldige sets
 * leveren geen volume- of progressiegegevens.
 *
 * Begrippen:
 *  - gewicht        = zwaarste set van een oefening in één sessie (kg)
 *  - setvolume      = gewicht × reps van één set
 *  - volume         = som van gewicht × reps over alle sets (van een oefening of van een training)
 */
import { PRType, SetLike, TrainingType, Workout } from "@/types/workout";
import { normalizeExerciseName } from "@/utils/exerciseNames";
import {
  ExerciseSessionStats,
  PR_TYPES,
  calculate1RM,
  summarizeExerciseSets,
} from "@/utils/fitnessCalculations";
import {
  addDaysToDateKey,
  addMonthsToDateKey,
  enumerateMonthKeys,
  enumerateWeekKeys,
  getDeviceTimeZone,
  isValidTimeZone,
  parseInstant,
  toDateKey,
  toIsoWeekKey,
  toMonthKey,
} from "@/utils/dates";

// ---------------------------------------------------------------------------------------------------------
// Basisstructuren
// ---------------------------------------------------------------------------------------------------------

export interface SessionExercise {
  exerciseKey: string;
  exerciseName: string;
  /** Alleen geldige sets (eindig, gewicht ≥ 0, reps ≥ 1). */
  sets: SetLike[];
  stats: ExerciseSessionStats;
  hasSets: boolean;
}

export interface Session {
  workoutId: string;
  trainingType: TrainingType;
  instantMs: number;
  startedAt: string;
  timeZone: string;
  /** Kalenderdag, week en maand in de OPGESLAGEN tijdzone van de workout. */
  dateKey: string;
  weekKey: string;
  monthKey: string;
  exercises: SessionExercise[];
  /** Totaal volume van de (eventueel gefilterde) oefeningen; `null` als er geen enkele geldige set is. */
  volume: number | null;
  /** Het volledige exemplaar, voor weergave. */
  workout: Workout;
}

export interface BuiltSessions {
  /** Chronologisch oplopend. */
  sessions: Session[];
  /** Workouts zonder geldige datum: niet bruikbaar voor tijdreeksen. */
  undated: Workout[];
}

export interface StatsFilters {
  /** Kalenderdag `YYYY-MM-DD`, inclusief. */
  from?: string | null;
  to?: string | null;
  /** Leeg of afwezig = alle types. */
  trainingTypes?: TrainingType[];
  /** Genormaliseerde oefeningsleutel (zie `normalizeExerciseName`). */
  exerciseKey?: string | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function workoutTimeZone(workout: Workout, fallback = getDeviceTimeZone()): string {
  return isValidTimeZone(workout.timeZone) ? workout.timeZone : fallback;
}

function toSessionExercise(raw: Workout["exercises"][number]): SessionExercise {
  const stats = summarizeExerciseSets(raw.sets);
  const valid = raw.sets.filter(
    (s) => Number.isFinite(s.weight) && Number.isFinite(s.reps) && s.weight >= 0 && s.reps >= 1
  );
  return {
    exerciseKey: normalizeExerciseName(raw.exercise),
    exerciseName: raw.exercise.trim(),
    sets: valid,
    stats,
    hasSets: stats.setCount > 0,
  };
}

function sessionVolume(exercises: SessionExercise[]): number | null {
  const withSets = exercises.filter((e) => e.hasSets);
  if (withSets.length === 0) return null;
  return withSets.reduce((sum, e) => sum + e.stats.exerciseVolume, 0);
}

/** Zet workouts om naar sessies met dag/week/maand in de opgeslagen tijdzone. */
export function buildSessions(workouts: Workout[], deviceTimeZone = getDeviceTimeZone()): BuiltSessions {
  const undated: Workout[] = [];
  const indexed: { session: Session; index: number }[] = [];

  workouts.forEach((workout, index) => {
    const instant = parseInstant(workout.startedAt);
    if (!instant) {
      undated.push(workout);
      return;
    }
    const timeZone = workoutTimeZone(workout, deviceTimeZone);
    const dateKey = toDateKey(instant, timeZone);
    const exercises = workout.exercises.map(toSessionExercise);
    indexed.push({
      index,
      session: {
        workoutId: workout.id,
        trainingType: workout.trainingType,
        instantMs: instant.getTime(),
        startedAt: workout.startedAt as string,
        timeZone,
        dateKey,
        weekKey: toIsoWeekKey(dateKey),
        monthKey: toMonthKey(dateKey),
        exercises,
        volume: sessionVolume(exercises),
        workout,
      },
    });
  });

  indexed.sort((a, b) => a.session.instantMs - b.session.instantMs || a.index - b.index);
  return { sessions: indexed.map((x) => x.session), undated };
}

// ---------------------------------------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------------------------------------

/**
 * Past de filters toe. Met een oefeningfilter blijven alleen sessies over waarin die oefening voorkomt, en
 * bevatten die sessies enkel die oefening (zodat volume en tellingen over die oefening gaan).
 */
export function filterSessions(sessions: Session[], filters: StatsFilters): Session[] {
  const types = filters.trainingTypes && filters.trainingTypes.length > 0 ? new Set(filters.trainingTypes) : null;
  const result: Session[] = [];
  for (const s of sessions) {
    if (filters.from && s.dateKey < filters.from) continue;
    if (filters.to && s.dateKey > filters.to) continue;
    if (types && !types.has(s.trainingType)) continue;
    if (filters.exerciseKey) {
      const only = s.exercises.filter((e) => e.exerciseKey === filters.exerciseKey);
      if (only.length === 0) continue;
      result.push({ ...s, exercises: only, volume: sessionVolume(only) });
    } else {
      result.push(s);
    }
  }
  return result;
}

export type PeriodPreset = "all" | "4w" | "3m" | "6m" | "12m" | "ytd" | "custom";

export const PERIOD_PRESET_LABELS: Record<PeriodPreset, string> = {
  all: "Alles",
  "4w": "Laatste 4 weken",
  "3m": "Laatste 3 maanden",
  "6m": "Laatste 6 maanden",
  "12m": "Laatste 12 maanden",
  ytd: "Dit jaar",
  custom: "Aangepast",
};

/** Zet een periode-keuze om naar een kalenderdagbereik. `today` is een kalenderdag in de tijdzone van het toestel. */
export function resolvePeriod(
  preset: PeriodPreset,
  today: string,
  custom?: { from?: string | null; to?: string | null }
): { from: string | null; to: string | null } {
  switch (preset) {
    case "all":
      return { from: null, to: null };
    case "4w":
      return { from: addDaysToDateKey(today, -27), to: today };
    case "3m":
      return { from: addMonthsToDateKey(today, -3), to: today };
    case "6m":
      return { from: addMonthsToDateKey(today, -6), to: today };
    case "12m":
      return { from: addMonthsToDateKey(today, -12), to: today };
    case "ytd":
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    case "custom":
      return { from: custom?.from || null, to: custom?.to || null };
  }
}

export interface ExerciseOption {
  key: string;
  /** Weergavenaam: de schrijfwijze van de meest recente registratie. */
  name: string;
  sessions: number;
}

export function listExercises(sessions: Session[]): ExerciseOption[] {
  const map = new Map<string, ExerciseOption & { lastMs: number }>();
  for (const s of sessions) {
    for (const e of s.exercises) {
      if (!e.exerciseKey || !e.hasSets) continue;
      const entry = map.get(e.exerciseKey);
      if (!entry) {
        map.set(e.exerciseKey, { key: e.exerciseKey, name: e.exerciseName, sessions: 1, lastMs: s.instantMs });
      } else {
        entry.sessions += 1;
        if (s.instantMs >= entry.lastMs) {
          entry.name = e.exerciseName;
          entry.lastMs = s.instantMs;
        }
      }
    }
  }
  return [...map.values()]
    .map(({ lastMs: _lastMs, ...rest }) => rest)
    .sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name, "nl"));
}

// ---------------------------------------------------------------------------------------------------------
// Aantal trainingen en volume per periode
// ---------------------------------------------------------------------------------------------------------

export interface PeriodCount {
  key: string;
  count: number;
}

function rangeKeys(
  sessions: Session[],
  granularity: "week" | "month",
  range?: { from?: string | null; to?: string | null }
): string[] {
  if (sessions.length === 0 && !(range?.from && range?.to)) return [];
  const first = range?.from ?? sessions[0]?.dateKey;
  const last = range?.to ?? sessions[sessions.length - 1]?.dateKey;
  if (!first || !last || first > last) return [];
  return granularity === "week"
    ? enumerateWeekKeys(toIsoWeekKey(first), toIsoWeekKey(last))
    : enumerateMonthKeys(toMonthKey(first), toMonthKey(last));
}

/**
 * Aantal trainingen per ISO-week (maandag = eerste dag) of kalendermaand, in de tijdzone van elke workout.
 * Perioden zonder training krijgen 0: dat is een echte waarneming, geen ontbrekend gegeven.
 */
export function countPerPeriod(
  sessions: Session[],
  granularity: "week" | "month",
  range?: { from?: string | null; to?: string | null }
): PeriodCount[] {
  const keys = rangeKeys(sessions, granularity, range);
  const counts = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const s of sessions) {
    const key = granularity === "week" ? s.weekKey : s.monthKey;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([key, count]) => ({ key, count }));
}

export interface VolumePoint {
  key: string;
  /** `null` = geen setgegevens (niet 0). */
  volume: number | null;
}

/** Totaal volume per training (chronologisch). Trainingen zonder geldige sets krijgen `null` en worden niet getekend. */
export function volumePerSession(sessions: Session[]): (VolumePoint & { dateKey: string; trainingType: TrainingType })[] {
  return sessions.map((s) => ({
    key: s.workoutId,
    dateKey: s.dateKey,
    trainingType: s.trainingType,
    volume: s.volume === null ? null : round1(s.volume),
  }));
}

/** Totaal volume per week of maand. Periodes zonder training: 0. Trainingen zonder sets dragen niets bij. */
export function volumePerPeriod(
  sessions: Session[],
  granularity: "week" | "month",
  range?: { from?: string | null; to?: string | null }
): VolumePoint[] {
  const keys = rangeKeys(sessions, granularity, range);
  const totals = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const s of sessions) {
    const key = granularity === "week" ? s.weekKey : s.monthKey;
    totals.set(key, (totals.get(key) ?? 0) + (s.volume ?? 0));
  }
  return [...totals.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, volume]) => ({ key, volume: round1(volume) }));
}

// ---------------------------------------------------------------------------------------------------------
// Progressie per oefening
// ---------------------------------------------------------------------------------------------------------

export interface ProgressionPoint {
  workoutId: string;
  dateKey: string;
  /** Zwaarste set (kg) in deze sessie. */
  maxWeight: number;
  /** Totaal aantal herhalingen over alle sets in deze sessie. */
  totalReps: number;
  /** Hoogste aantal herhalingen in één set. */
  maxReps: number;
  /** Totaal volume van de oefening (kg). */
  exerciseVolume: number;
  best1RM: number;
  setCount: number;
}

export function exerciseProgression(sessions: Session[], exerciseKey: string): ProgressionPoint[] {
  const points: ProgressionPoint[] = [];
  for (const s of sessions) {
    for (const e of s.exercises) {
      if (e.exerciseKey !== exerciseKey || !e.hasSets) continue;
      points.push({
        workoutId: s.workoutId,
        dateKey: s.dateKey,
        maxWeight: e.stats.maxWeight,
        totalReps: e.stats.totalReps,
        maxReps: e.stats.maxReps,
        exerciseVolume: round1(e.stats.exerciseVolume),
        best1RM: e.stats.best1RM,
        setCount: e.stats.setCount,
      });
    }
  }
  return points;
}

// ---------------------------------------------------------------------------------------------------------
// Persoonlijke records
// ---------------------------------------------------------------------------------------------------------

export interface RecordEntry {
  value: number;
  dateKey: string;
  workoutId: string;
  /** Bij een setrecord: de set waarmee het record gezet is. Bij oefeningvolume: aantal sets. */
  weight?: number;
  reps?: number;
  setCount?: number;
}

export interface ExerciseRecords {
  exerciseKey: string;
  exerciseName: string;
  records: Record<PRType, RecordEntry | null>;
}

/**
 * Persoonlijke records per oefening, berekend over de meegegeven sessies in chronologische volgorde.
 * Een record moet strikt hoger zijn dan het vorige en groter dan 0; bij gelijke waarden behoudt de eerste.
 */
export function personalRecords(sessions: Session[], exerciseKey?: string | null): ExerciseRecords[] {
  const byExercise = new Map<string, ExerciseRecords>();

  for (const s of sessions) {
    for (const e of s.exercises) {
      if (!e.hasSets) continue;
      if (exerciseKey && e.exerciseKey !== exerciseKey) continue;

      let entry = byExercise.get(e.exerciseKey);
      if (!entry) {
        entry = {
          exerciseKey: e.exerciseKey,
          exerciseName: e.exerciseName,
          records: { maxWeight: null, bestSetVolume: null, bestExerciseVolume: null, best1RM: null },
        };
        byExercise.set(e.exerciseKey, entry);
      }
      entry.exerciseName = e.exerciseName; // meest recente schrijfwijze
      const base = { dateKey: s.dateKey, workoutId: s.workoutId };

      const consider = (type: PRType, value: number, extra: Partial<RecordEntry>) => {
        const current = entry!.records[type];
        if (value > 0 && (!current || value > current.value)) {
          entry!.records[type] = { value: round1(value), ...base, ...extra };
        }
      };

      for (const set of e.sets) {
        consider("maxWeight", set.weight, { weight: set.weight, reps: set.reps });
        consider("bestSetVolume", set.weight * set.reps, { weight: set.weight, reps: set.reps });
        if (set.weight > 0) consider("best1RM", calculate1RM(set.weight, set.reps), { weight: set.weight, reps: set.reps });
      }
      consider("bestExerciseVolume", e.stats.exerciseVolume, { setCount: e.stats.setCount });
    }
  }

  return [...byExercise.values()].sort((a, b) => a.exerciseName.localeCompare(b.exerciseName, "nl"));
}

// ---------------------------------------------------------------------------------------------------------
// Vergelijking met de vorige sessie
// ---------------------------------------------------------------------------------------------------------

export interface Delta {
  current: number;
  previous: number;
  diff: number;
  /** `null` als de vorige waarde 0 is (procent is dan niet te berekenen). */
  percent: number | null;
}

export type ProgressStatus = "first" | "up" | "down" | "same" | "mixed";

export interface ExerciseComparison {
  exerciseKey: string;
  exerciseName: string;
  current: ExerciseSessionStats;
  previous: ExerciseSessionStats | null;
  previousDateKey: string | null;
  previousWorkoutId: string | null;
  maxWeight: Delta | null;
  exerciseVolume: Delta | null;
  totalReps: Delta | null;
  best1RM: Delta | null;
  /**
   * 'first' = geen eerdere sessie; 'up' = minstens één van gewicht/volume/1RM hoger en geen lager;
   * 'down' = minstens één lager en geen hoger; 'same' = alles gelijk; 'mixed' = deels hoger, deels lager.
   */
  status: ProgressStatus;
}

const makeDelta = (current: number, previous: number): Delta => ({
  current: round1(current),
  previous: round1(previous),
  diff: round1(current - previous),
  percent: previous > 0 ? round1(((current - previous) / previous) * 100) : null,
});

function statusFrom(deltas: Delta[]): ProgressStatus {
  const up = deltas.some((d) => d.diff > 0);
  const down = deltas.some((d) => d.diff < 0);
  if (up && down) return "mixed";
  if (up) return "up";
  if (down) return "down";
  return "same";
}

/**
 * Vergelijkt elke oefening van een sessie met de vorige sessie van dezelfde (genormaliseerde) oefening. De
 * vorige sessie wordt gezocht in ALLE sessies (`allSessions`, ongefilterd), zodat een filter een vergelijking
 * niet ten onrechte als "eerste keer" laat lijken.
 */
export function compareWithPrevious(allSessions: Session[], target: Session): ExerciseComparison[] {
  const targetIndex = allSessions.findIndex((s) => s.workoutId === target.workoutId);
  const earlier = targetIndex >= 0 ? allSessions.slice(0, targetIndex) : allSessions.filter((s) => s.instantMs < target.instantMs);

  return target.exercises
    .filter((e) => e.hasSets)
    .map((e) => {
      let prev: { session: Session; exercise: SessionExercise } | null = null;
      for (let i = earlier.length - 1; i >= 0; i--) {
        const match = earlier[i].exercises.find((x) => x.exerciseKey === e.exerciseKey && x.hasSets);
        if (match) {
          prev = { session: earlier[i], exercise: match };
          break;
        }
      }
      if (!prev) {
        return {
          exerciseKey: e.exerciseKey,
          exerciseName: e.exerciseName,
          current: e.stats,
          previous: null,
          previousDateKey: null,
          previousWorkoutId: null,
          maxWeight: null,
          exerciseVolume: null,
          totalReps: null,
          best1RM: null,
          status: "first" as const,
        };
      }
      const p = prev.exercise.stats;
      const maxWeight = makeDelta(e.stats.maxWeight, p.maxWeight);
      const exerciseVolume = makeDelta(e.stats.exerciseVolume, p.exerciseVolume);
      const totalReps = makeDelta(e.stats.totalReps, p.totalReps);
      const best1RM = makeDelta(e.stats.best1RM, p.best1RM);
      return {
        exerciseKey: e.exerciseKey,
        exerciseName: e.exerciseName,
        current: e.stats,
        previous: p,
        previousDateKey: prev.session.dateKey,
        previousWorkoutId: prev.session.workoutId,
        maxWeight,
        exerciseVolume,
        totalReps,
        best1RM,
        status: statusFrom([maxWeight, exerciseVolume, best1RM]),
      };
    });
}

export interface WorkoutComparison {
  previousWorkoutId: string | null;
  previousDateKey: string | null;
  volume: Delta | null;
}

/**
 * Totaalvolume van een training t.o.v. de vorige training van hetzelfde type (bij "Custom"/"Onbekend": de vorige
 * training in het algemeen). Trainingen zonder setgegevens worden overgeslagen en nooit als 0 behandeld.
 */
export function compareWorkoutTotals(allSessions: Session[], target: Session): WorkoutComparison {
  const none: WorkoutComparison = { previousWorkoutId: null, previousDateKey: null, volume: null };
  if (target.volume === null) return none;
  const targetIndex = allSessions.findIndex((s) => s.workoutId === target.workoutId);
  const earlier = targetIndex >= 0 ? allSessions.slice(0, targetIndex) : allSessions.filter((s) => s.instantMs < target.instantMs);
  const generic = target.trainingType === "Custom" || target.trainingType === "Onbekend";

  for (let i = earlier.length - 1; i >= 0; i--) {
    const s = earlier[i];
    if (s.volume === null) continue;
    if (!generic && s.trainingType !== target.trainingType) continue;
    return { previousWorkoutId: s.workoutId, previousDateKey: s.dateKey, volume: makeDelta(target.volume, s.volume) };
  }
  return none;
}

// ---------------------------------------------------------------------------------------------------------
// Samenvatting en datakwaliteit
// ---------------------------------------------------------------------------------------------------------

export interface DataQuality {
  totalWorkouts: number;
  /** Zonder geldige datum: buiten alle tijdreeksen en filters. */
  withoutDate: number;
  /** Gedateerd, maar zonder één geldige set: geteld als training, zonder volume. */
  withoutSetData: number;
}

export function assessDataQuality(built: BuiltSessions): DataQuality {
  return {
    totalWorkouts: built.sessions.length + built.undated.length,
    withoutDate: built.undated.length,
    withoutSetData: built.sessions.filter((s) => s.volume === null).length,
  };
}

export interface StatsSummary {
  sessions: number;
  totalVolume: number;
  exercises: number;
}

export function summarize(sessions: Session[]): StatsSummary {
  return {
    sessions: sessions.length,
    totalVolume: round1(sessions.reduce((sum, s) => sum + (s.volume ?? 0), 0)),
    exercises: new Set(sessions.flatMap((s) => s.exercises.filter((e) => e.hasSets).map((e) => e.exerciseKey))).size,
  };
}

export { PR_TYPES };
