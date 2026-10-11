/**
 * Opslaglaag voor workouts.
 *
 * Ontwerp (veiligheid vóór alles):
 * - De oorspronkelijke localStorage-sleutel (`fitness-coach-workouts`) wordt NOOIT gewijzigd of verwijderd.
 *   Versie 2 leeft onder een eigen sleutel. Terugschakelen naar de oude app-versie verliest dus niets.
 * - Vóór de eerste migratie wordt de ruwe oude waarde extra gekopieerd naar een back-upsleutel.
 * - Onleesbare of ongeldige data wordt in quarantaine gezet (nieuwe sleutel) in plaats van overschreven.
 * - Een onbekende (nieuwere) schemaversie maakt de opslag alleen-lezen.
 * - Elke mutatie leest eerst de actuele opslag (tegen overschrijven tussen tabbladen) en weigert
 *   bestaande ids te overschrijven.
 *
 * De `WorkoutRepository`-interface is asynchroon, zodat een backend later de localStorage-implementatie
 * kan vervangen zonder dat de UI wijzigt.
 */
import { ExerciseLog, TrashedWorkout, TrainingType, Workout } from "@/types/workout";
import {
  NormalizeResult,
  migrateLegacyLogs,
  normalizeWorkout,
  splitLegacyAndWorkouts,
  withDerivedTotals,
} from "@/utils/workoutNormalization";
import { parseInstant } from "@/utils/dates";

export const LEGACY_STORAGE_KEY = "fitness-coach-workouts";
export const STORAGE_KEY_V2 = "fitness-coach-workouts-v2";
export const LEGACY_BACKUP_KEY = "fitness-coach-workouts.backup-before-v2";
export const PRE_IMPORT_BACKUP_KEY = "fitness-coach-workouts-v2.backup-before-import";
export const CURRENT_SCHEMA_VERSION = 2;
export const MAX_TRASH = 50;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type LoadStatus =
  | "empty" // niets opgeslagen
  | "loaded" // v2 gelezen
  | "migrated" // oude data gemigreerd naar v2
  | "corrupt" // v2 onleesbaar: in quarantaine gezet
  | "legacy-unreadable" // oude data onleesbaar: onaangeroerd gelaten
  | "unsupported"; // nieuwere schemaversie: alleen-lezen

export interface LoadResult {
  workouts: Workout[];
  trash: TrashedWorkout[];
  status: LoadStatus;
  warnings: string[];
  readOnly: boolean;
}

export type MutationError =
  | "read-only"
  | "not-found"
  | "duplicate-id"
  | "storage-error"
  | "invalid";

/**
 * Resultaat van een mutatie. Bij `ok: false` bevatten `workouts`/`trash` de ongewijzigde actuele stand,
 * zodat de UI altijd kan synchroniseren met wat echt is opgeslagen.
 */
export interface MutationResult {
  ok: boolean;
  workouts: Workout[];
  trash: TrashedWorkout[];
  error?: MutationError;
  message?: string;
}

export interface WorkoutChanges {
  trainingType: TrainingType;
  exercises: ExerciseLog[];
}

export interface ImportOutcome {
  imported: number;
  skippedDuplicates: number;
  conflicts: number;
  invalid: number;
  warnings: string[];
}

export interface ImportResult extends MutationResult, ImportOutcome {}

export interface WorkoutRepository {
  load(): Promise<LoadResult>;
  add(workout: Workout): Promise<MutationResult>;
  update(id: string, changes: WorkoutChanges): Promise<MutationResult>;
  /** Verplaatst naar de prullenbak (kan ongedaan gemaakt worden); verwijdert niets definitief. */
  remove(id: string): Promise<MutationResult>;
  restore(id: string): Promise<MutationResult>;
  /** Voegt toe zonder bestaande workouts te overschrijven. */
  importWorkouts(items: unknown[]): Promise<ImportResult>;
  /** Meldt wijzigingen door andere tabbladen; geeft een functie om te stoppen. */
  subscribe(listener: () => void): () => void;
}

interface Envelope {
  schemaVersion: number;
  savedAt: string;
  workouts: unknown[];
  trash?: unknown[];
}

const nowIso = () => new Date().toISOString();
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Nieuwste eerst; workouts zonder geldige datum onderaan, in bestaande volgorde. */
export function sortWorkoutsNewestFirst(workouts: Workout[]): Workout[] {
  return workouts
    .map((w, index) => ({ w, index, t: parseInstant(w.startedAt)?.getTime() ?? null }))
    .sort((a, b) => {
      if (a.t !== null && b.t !== null) return b.t - a.t || a.index - b.index;
      if (a.t !== null) return -1;
      if (b.t !== null) return 1;
      return a.index - b.index;
    })
    .map((x) => x.w);
}

function quarantine(storage: StorageLike, baseKey: string, payload: string): string | null {
  const key = `${baseKey}.quarantine-${Date.now()}`;
  try {
    storage.setItem(key, payload);
    return key;
  } catch {
    return null;
  }
}

function collect(results: NormalizeResult[], rawItems: unknown[], warnings: string[]) {
  const workouts: Workout[] = [];
  const problematic: unknown[] = [];
  results.forEach((r, i) => {
    if (r.workout) workouts.push(r.workout);
    if (!r.workout || r.issues.length > 0) {
      problematic.push(rawItems[i]);
      const label = r.workout ? `workout ${r.workout.id}` : `item ${i + 1}`;
      warnings.push(`${label}: ${r.issues.join("; ")}`);
    }
  });
  return { workouts, problematic };
}

function normalizeEnvelopeList(raw: unknown[], warnings: string[]) {
  return collect(raw.map((w) => normalizeWorkout(w)), raw, warnings);
}

function readTrash(raw: unknown, warnings: string[]): TrashedWorkout[] {
  if (!Array.isArray(raw)) return [];
  const trash: TrashedWorkout[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const { workout, issues } = normalizeWorkout(item.workout);
    if (!workout) {
      warnings.push(`prullenbak-item overgeslagen: ${issues.join("; ")}`);
      continue;
    }
    trash.push({
      workout,
      deletedAt: typeof item.deletedAt === "string" ? item.deletedAt : nowIso(),
    });
  }
  return trash.slice(0, MAX_TRASH);
}

/** Leest en (indien nodig) migreert. Schrijft alleen naar nieuwe sleutels; de oude data blijft staan. */
export function loadFromStorage(storage: StorageLike): LoadResult {
  const warnings: string[] = [];

  // 1. Versie 2
  let rawV2: string | null = null;
  try {
    rawV2 = storage.getItem(STORAGE_KEY_V2);
  } catch {
    return { workouts: [], trash: [], status: "empty", warnings: ["opslag is niet beschikbaar"], readOnly: true };
  }
  if (rawV2 !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawV2);
    } catch {
      parsed = undefined;
    }
    if (!isRecord(parsed) || !Array.isArray(parsed.workouts) || typeof parsed.schemaVersion !== "number") {
      const key = quarantine(storage, STORAGE_KEY_V2, rawV2);
      warnings.push(
        key
          ? `Opgeslagen data was onleesbaar en is veiliggesteld onder "${key}".`
          : "Opgeslagen data was onleesbaar en kon niet veiliggesteld worden."
      );
      return { workouts: [], trash: [], status: "corrupt", warnings, readOnly: key === null };
    }
    if (parsed.schemaVersion > CURRENT_SCHEMA_VERSION) {
      return {
        workouts: [],
        trash: [],
        status: "unsupported",
        warnings: [`Data is opgeslagen met een nieuwere versie van de app (schema ${parsed.schemaVersion}). Er wordt niets gewijzigd.`],
        readOnly: true,
      };
    }
    const { workouts, problematic } = normalizeEnvelopeList(parsed.workouts, warnings);
    if (problematic.length > 0) {
      const key = quarantine(storage, STORAGE_KEY_V2, JSON.stringify(problematic));
      if (key) warnings.push(`De originele versie van afwijkende items is bewaard onder "${key}".`);
    }
    return {
      workouts: sortWorkoutsNewestFirst(workouts),
      trash: readTrash(parsed.trash, warnings),
      status: "loaded",
      warnings,
      readOnly: false,
    };
  }

  // 2. Oorspronkelijke opslag
  let rawLegacy: string | null = null;
  try {
    rawLegacy = storage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    rawLegacy = null;
  }
  if (rawLegacy === null) {
    return { workouts: [], trash: [], status: "empty", warnings, readOnly: false };
  }

  let legacyParsed: unknown;
  try {
    legacyParsed = JSON.parse(rawLegacy);
  } catch {
    legacyParsed = undefined;
  }
  if (!Array.isArray(legacyParsed)) {
    warnings.push(
      "De oorspronkelijke opgeslagen workouts kunnen niet gelezen worden. Ze zijn onaangeroerd gelaten."
    );
    return { workouts: [], trash: [], status: "legacy-unreadable", warnings, readOnly: false };
  }

  // Back-up vóór migratie (alleen als er nog geen is; nooit overschrijven).
  try {
    if (storage.getItem(LEGACY_BACKUP_KEY) === null) storage.setItem(LEGACY_BACKUP_KEY, rawLegacy);
  } catch {
    warnings.push("De back-up van de oorspronkelijke data kon niet gemaakt worden; de oorspronkelijke sleutel blijft wel onaangeroerd.");
  }

  const { workouts: v1Workouts, logs } = splitLegacyAndWorkouts(legacyParsed);
  const results = [...v1Workouts.map((w) => normalizeWorkout(w)), ...migrateLegacyLogs(logs)];
  const { workouts } = collect(results, results.map(() => null), warnings);

  const sorted = sortWorkoutsNewestFirst(workouts);
  const persisted = writeEnvelope(storage, sorted, []);
  if (!persisted.ok) warnings.push("De gemigreerde data kon (nog) niet opgeslagen worden; dit wordt bij de volgende keer opnieuw geprobeerd.");

  return { workouts: sorted, trash: [], status: "migrated", warnings, readOnly: false };
}

function writeEnvelope(
  storage: StorageLike,
  workouts: Workout[],
  trash: TrashedWorkout[]
): { ok: boolean; message?: string } {
  const envelope: Envelope = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    savedAt: nowIso(),
    workouts,
    trash: trash.slice(0, MAX_TRASH),
  };
  try {
    storage.setItem(STORAGE_KEY_V2, JSON.stringify(envelope));
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "opslaan mislukt" };
  }
}

/** `window.localStorage` kan een SecurityError gooien (bv. geblokkeerde site-data); dan is er geen opslag. */
export function getBrowserStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function createLocalStorageRepository(
  storage: StorageLike | null = getBrowserStorage()
): WorkoutRepository {
  const memory = new Map<string, string>();
  const fallback: StorageLike = {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => void memory.set(k, v),
    removeItem: (k) => void memory.delete(k),
  };
  const store = storage ?? fallback;

  const fail = (current: LoadResult, error: MutationError, message: string): MutationResult => ({
    ok: false,
    workouts: current.workouts,
    trash: current.trash,
    error,
    message,
  });

  const commit = (
    current: LoadResult,
    workouts: Workout[],
    trash: TrashedWorkout[]
  ): MutationResult => {
    const sorted = sortWorkoutsNewestFirst(workouts);
    const written = writeEnvelope(store, sorted, trash);
    if (!written.ok) {
      return fail(current, "storage-error", `Opslaan mislukt: ${written.message}`);
    }
    return { ok: true, workouts: sorted, trash: trash.slice(0, MAX_TRASH) };
  };

  const readOnlyFail = (current: LoadResult): MutationResult =>
    fail(current, "read-only", "De opslag is alleen-lezen; er is niets gewijzigd.");

  return {
    async load() {
      return loadFromStorage(store);
    },

    async add(workout) {
      const current = loadFromStorage(store);
      if (current.readOnly) return readOnlyFail(current);
      const { workout: normalized, issues } = normalizeWorkout(workout);
      if (!normalized) return fail(current, "invalid", `Ongeldige workout: ${issues.join("; ")}`);
      if (current.workouts.some((w) => w.id === normalized.id) || current.trash.some((t) => t.workout.id === normalized.id)) {
        return fail(current, "duplicate-id", "Er bestaat al een workout met dit id; er is niets overschreven.");
      }
      const stamped: Workout = { ...normalized, createdAt: normalized.createdAt ?? nowIso() };
      return commit(current, [stamped, ...current.workouts], current.trash);
    },

    async update(id, changes) {
      const current = loadFromStorage(store);
      if (current.readOnly) return readOnlyFail(current);
      const existing = current.workouts.find((w) => w.id === id);
      if (!existing) return fail(current, "not-found", "Workout niet gevonden.");
      const candidate = normalizeWorkout({
        ...existing,
        trainingType: changes.trainingType,
        exercises: changes.exercises,
      });
      if (!candidate.workout) {
        return fail(current, "invalid", `Ongeldige wijziging: ${candidate.issues.join("; ")}`);
      }
      // Onveranderlijk: id, gebruiker, starttijd, tijdzone, aanmaakmoment.
      const updated = withDerivedTotals({
        ...candidate.workout,
        id: existing.id,
        userId: existing.userId,
        date: existing.date,
        startedAt: existing.startedAt,
        timeZone: existing.timeZone,
        createdAt: existing.createdAt,
        updatedAt: nowIso(),
      });
      return commit(
        current,
        current.workouts.map((w) => (w.id === id ? updated : w)),
        current.trash
      );
    },

    async remove(id) {
      const current = loadFromStorage(store);
      if (current.readOnly) return readOnlyFail(current);
      const existing = current.workouts.find((w) => w.id === id);
      if (!existing) return fail(current, "not-found", "Workout niet gevonden.");
      return commit(
        current,
        current.workouts.filter((w) => w.id !== id),
        [{ workout: existing, deletedAt: nowIso() }, ...current.trash]
      );
    },

    async restore(id) {
      const current = loadFromStorage(store);
      if (current.readOnly) return readOnlyFail(current);
      const item = current.trash.find((t) => t.workout.id === id);
      if (!item) return fail(current, "not-found", "Niet gevonden in de prullenbak.");
      if (current.workouts.some((w) => w.id === id)) {
        return fail(current, "duplicate-id", "Er bestaat al een workout met dit id.");
      }
      return commit(
        current,
        [item.workout, ...current.workouts],
        current.trash.filter((t) => t.workout.id !== id)
      );
    },

    async importWorkouts(items) {
      const current = loadFromStorage(store);
      const noOutcome = { imported: 0, skippedDuplicates: 0, conflicts: 0, invalid: 0, warnings: [] as string[] };
      if (current.readOnly) return { ...readOnlyFail(current), ...noOutcome };
      const warnings: string[] = [];
      const { workouts: v1Workouts, logs } = splitLegacyAndWorkouts(items);
      const results = [...v1Workouts.map((w) => normalizeWorkout(w)), ...migrateLegacyLogs(logs)];

      const known = new Map(current.workouts.map((w) => [w.id, w]));
      const trashed = new Set(current.trash.map((t) => t.workout.id));
      const toAdd: Workout[] = [];
      const seenInFile = new Set<string>();
      let skippedDuplicates = 0;
      let conflicts = 0;
      let invalid = 0;

      for (const r of results) {
        if (!r.workout) {
          invalid++;
          warnings.push(`Item overgeslagen: ${r.issues.join("; ")}`);
          continue;
        }
        const w = r.workout;
        const existing = known.get(w.id);
        if (existing || trashed.has(w.id) || seenInFile.has(w.id)) {
          if (existing && JSON.stringify(stripMeta(existing)) === JSON.stringify(stripMeta(w))) skippedDuplicates++;
          else {
            conflicts++;
            warnings.push(`Workout ${w.id} bestaat al met andere inhoud en is niet overschreven.`);
          }
          continue;
        }
        seenInFile.add(w.id);
        toAdd.push(w);
      }

      if (toAdd.length > 0) {
        // Rollende back-up van de actuele staat vóór de import.
        try {
          const before = store.getItem(STORAGE_KEY_V2);
          if (before !== null) store.setItem(PRE_IMPORT_BACKUP_KEY, before);
        } catch {
          return {
            ...fail(current, "storage-error", "Back-up vóór import mislukt; er is niets geïmporteerd."),
            ...noOutcome,
          };
        }
        const committed = commit(current, [...toAdd, ...current.workouts], current.trash);
        if (!committed.ok) return { ...committed, ...noOutcome, invalid, conflicts, skippedDuplicates, warnings };
        return { ...committed, imported: toAdd.length, skippedDuplicates, conflicts, invalid, warnings };
      }
      return {
        ok: true,
        workouts: current.workouts,
        trash: current.trash,
        imported: 0,
        skippedDuplicates,
        conflicts,
        invalid,
        warnings,
      };
    },

    subscribe(listener) {
      if (typeof window === "undefined") return () => {};
      const handler = (e: StorageEvent) => {
        if (e.key === null || e.key === STORAGE_KEY_V2) listener();
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
  };
}

/** Vergelijkt workouts zonder tijdstempels die niets met de inhoud te maken hebben. */
function stripMeta(w: Workout) {
  return { ...w, createdAt: undefined, updatedAt: undefined };
}
