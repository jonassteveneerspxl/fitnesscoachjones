/**
 * Workouts in een online database (Firestore), achter dezelfde `WorkoutRepository`-interface als de lokale opslag.
 * De UI merkt het verschil niet. Alleen de `WorkoutBackend` weet van Firestore; hier staat de logica, zodat die
 * zonder echte database te testen is.
 *
 * Ontwerpkeuzes:
 * - **Nooit definitief verwijderen.** "Verwijderen" zet `deletedAt` op het document (prullenbak). Er bestaat geen
 *   delete-operatie in de backend-interface, dus een fout in deze laag kan geen workout kwijtmaken.
 * - **Offline eerst.** Een schrijfactie is lokaal toegepast zodra `backend.write` terugkeert; we wachten niet op de
 *   server. Zonder bereik werkt de app dus gewoon door en synchroniseert later. Een latere weigering door de server
 *   (bv. regels) wordt via `onWriteError` gemeld; de live-weergave corrigeert zichzelf dan.
 * - **Niets overschrijven.** Toevoegen en importeren weigeren een bestaand id; bijwerken laat id, starttijd,
 *   tijdzone en aanmaakmoment ongemoeid.
 * - **Eén bron van waarheid per gebruiker.** Alle documenten staan onder de eigen gebruiker; `userId` wordt bij
 *   toevoegen altijd op die gebruiker gezet.
 */
import { TrashedWorkout, Workout } from "@/types/workout";
import {
  NormalizeResult,
  migrateLegacyLogs,
  normalizeWorkout,
  splitLegacyAndWorkouts,
  withDerivedTotals,
} from "@/utils/workoutNormalization";
import {
  CURRENT_SCHEMA_VERSION,
  ImportResult,
  LoadResult,
  MAX_TRASH,
  MutationError,
  MutationResult,
  WorkoutChanges,
  WorkoutRepository,
  sortWorkoutsNewestFirst,
} from "@/utils/workoutStorage";

export interface RemoteDoc {
  id: string;
  data: Record<string, unknown>;
}

export interface RemoteSnapshot {
  docs: RemoteDoc[];
  /** Komt uit de lokale cache en is nog niet door de server bevestigd. */
  fromCache: boolean;
  hasPendingWrites: boolean;
}

/** Een document volledig schrijven (aanmaken of vervangen). Bewust geen verwijderoperatie. */
export interface WriteOp {
  id: string;
  data: Record<string, unknown>;
}

export interface WorkoutBackend {
  /** Live weergave van alle documenten van de gebruiker. Geeft een functie om te stoppen. */
  listen(onData: (snapshot: RemoteSnapshot) => void, onError: (error: unknown) => void): () => void;
  /**
   * Schrijft documenten. De wijziging is lokaal toegepast zodra deze aanroep terugkeert (een synchrone fout
   * betekent dat niets is geschreven). Het promise lost pas op als de server het bevestigt; zonder bereik kan
   * dat lang duren en dat is normaal.
   */
  write(ops: WriteOp[]): Promise<void>;
  /** Wacht tot alle lokale wijzigingen door de server bevestigd zijn; `false` bij time-out. */
  flush(timeoutMs: number): Promise<boolean>;
}

export interface RemoteRepositoryOptions {
  /** De ingelogde gebruiker; alle documenten krijgen dit als `userId`. */
  uid: string;
  backend: WorkoutBackend;
  /** Wordt aangeroepen als de server een schrijfactie achteraf weigert of die mislukt. */
  onWriteError?: (message: string) => void;
  /** Hoe lang `load()` wacht op de eerste gegevens voordat het met een lege lijst doorgaat. */
  loadTimeoutMs?: number;
  now?: () => Date;
}

export interface RemoteWorkoutRepository extends WorkoutRepository {
  /** Stopt het luisteren. Aanroepen als de gebruiker uitlogt of de provider verdwijnt. */
  dispose(): void;
  /** Wacht tot alles gesynchroniseerd is. `false` = er staan nog wijzigingen klaar die de server niet bevestigde. */
  flushPending(timeoutMs?: number): Promise<boolean>;
}

export function describeRemoteError(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
  switch (code) {
    case "permission-denied":
      return "Geen toegang tot je gegevens. Controleer of je ingelogd bent en of de Firestore-regels zijn gepubliceerd.";
    case "unauthenticated":
      return "Je bent niet meer ingelogd. Log opnieuw in.";
    case "resource-exhausted":
      return "De dagelijkse limiet van de database is bereikt. Probeer het later opnieuw.";
    case "unavailable":
    case "deadline-exceeded":
      return "De database is nu niet bereikbaar. Wijzigingen worden bewaard en later gesynchroniseerd.";
    default:
      return `Synchroniseren met je account is mislukt${code ? ` (${code})` : ""}.`;
  }
}

/** Haalt `undefined` weg en maakt er een gewoon JSON-object van, zoals Firestore dat verwacht. */
function toDoc(workout: Workout, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return JSON.parse(JSON.stringify({ ...workout, schemaVersion: CURRENT_SCHEMA_VERSION, ...extra })) as Record<string, unknown>;
}

/** Vergelijkt workouts zonder tijdstempels die niets met de inhoud te maken hebben. */
function stripMeta(w: Workout) {
  return { ...w, createdAt: undefined, updatedAt: undefined, userId: undefined };
}

interface State {
  workouts: Workout[];
  trash: TrashedWorkout[];
  warnings: string[];
}

function deriveState(snapshot: RemoteSnapshot): State {
  const warnings: string[] = [];
  const workouts: Workout[] = [];
  const trash: TrashedWorkout[] = [];
  for (const d of snapshot.docs) {
    const { workout } = normalizeWorkout({ ...d.data, id: d.id });
    if (!workout) {
      warnings.push(`Workout ${d.id} kon niet gelezen worden en wordt overgeslagen (niet gewijzigd of verwijderd).`);
      continue;
    }
    const deletedAt = d.data.deletedAt;
    if (typeof deletedAt === "string") trash.push({ workout, deletedAt });
    else workouts.push(workout);
  }
  trash.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  return { workouts: sortWorkoutsNewestFirst(workouts), trash: trash.slice(0, MAX_TRASH), warnings };
}

export function createRemoteWorkoutRepository(options: RemoteRepositoryOptions): RemoteWorkoutRepository {
  const { uid, backend, onWriteError, loadTimeoutMs = 10_000, now = () => new Date() } = options;
  const nowIso = () => now().toISOString();

  let state: State = { workouts: [], trash: [], warnings: [] };
  let loaded = false;
  let failure: string | null = null;
  let stopListening: (() => void) | null = null;
  let firstData: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  const ensureListening = (): Promise<void> => {
    if (firstData) return firstData;
    firstData = new Promise<void>((resolve) => {
      let settled = false;
      const settle = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      const timer = setTimeout(settle, loadTimeoutMs);
      try {
        stopListening = backend.listen(
          (snapshot) => {
            // Is `load()` al klaar (door eerdere gegevens of door de time-out), dan moet de hook dit horen.
            // Komen dit de eerste gegevens binnen vóór de time-out, dan krijgt `load()` ze zelf terug.
            const loadAlreadyReturned = settled;
            state = deriveState(snapshot);
            loaded = true;
            failure = null;
            clearTimeout(timer);
            settle();
            if (loadAlreadyReturned) notify();
          },
          (error) => {
            failure = describeRemoteError(error);
            clearTimeout(timer);
            settle();
            notify();
          }
        );
      } catch (error) {
        failure = describeRemoteError(error);
        clearTimeout(timer);
        settle();
      }
    });
    return firstData;
  };

  const snapshotResult = (): LoadResult => {
    if (failure && !loaded) {
      return { workouts: [], trash: [], status: "unavailable", warnings: [failure], readOnly: true };
    }
    return {
      workouts: state.workouts,
      trash: state.trash,
      status: loaded ? (state.workouts.length + state.trash.length === 0 ? "empty" : "loaded") : "empty",
      warnings: failure ? [...state.warnings, failure] : state.warnings,
      readOnly: false,
    };
  };

  const fail = (error: MutationError, message: string): MutationResult => ({
    ok: false,
    workouts: state.workouts,
    trash: state.trash,
    error,
    message,
  });

  /** Schrijft, past de lokale stand direct aan en meldt latere weigeringen. */
  const commit = (ops: WriteOp[], next: { workouts: Workout[]; trash: TrashedWorkout[] }): MutationResult => {
    try {
      const pending = backend.write(ops);
      pending.catch((error) => onWriteError?.(describeRemoteError(error)));
    } catch (error) {
      return fail("storage-error", `Opslaan mislukt: ${describeRemoteError(error)}`);
    }
    state = { ...state, workouts: sortWorkoutsNewestFirst(next.workouts), trash: next.trash.slice(0, MAX_TRASH) };
    return { ok: true, workouts: state.workouts, trash: state.trash };
  };

  const unavailable = (): MutationResult | null =>
    failure && !loaded ? fail("read-only", failure) : null;

  return {
    async load() {
      await ensureListening();
      return snapshotResult();
    },

    async add(workout) {
      await ensureListening();
      const blocked = unavailable();
      if (blocked) return blocked;
      const { workout: normalized, issues } = normalizeWorkout(workout);
      if (!normalized) return fail("invalid", `Ongeldige workout: ${issues.join("; ")}`);
      if (state.workouts.some((w) => w.id === normalized.id) || state.trash.some((t) => t.workout.id === normalized.id)) {
        return fail("duplicate-id", "Er bestaat al een workout met dit id; er is niets overschreven.");
      }
      const stamped: Workout = { ...normalized, userId: uid, createdAt: normalized.createdAt ?? nowIso() };
      return commit([{ id: stamped.id, data: toDoc(stamped) }], {
        workouts: [stamped, ...state.workouts],
        trash: state.trash,
      });
    },

    async update(id, changes: WorkoutChanges) {
      await ensureListening();
      const blocked = unavailable();
      if (blocked) return blocked;
      const existing = state.workouts.find((w) => w.id === id);
      if (!existing) return fail("not-found", "Workout niet gevonden.");
      const candidate = normalizeWorkout({ ...existing, trainingType: changes.trainingType, exercises: changes.exercises });
      if (!candidate.workout) return fail("invalid", `Ongeldige wijziging: ${candidate.issues.join("; ")}`);
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
      return commit([{ id, data: toDoc(updated) }], {
        workouts: state.workouts.map((w) => (w.id === id ? updated : w)),
        trash: state.trash,
      });
    },

    async remove(id) {
      await ensureListening();
      const blocked = unavailable();
      if (blocked) return blocked;
      const existing = state.workouts.find((w) => w.id === id);
      if (!existing) return fail("not-found", "Workout niet gevonden.");
      const deletedAt = nowIso();
      return commit([{ id, data: toDoc(existing, { deletedAt }) }], {
        workouts: state.workouts.filter((w) => w.id !== id),
        trash: [{ workout: existing, deletedAt }, ...state.trash],
      });
    },

    async restore(id) {
      await ensureListening();
      const blocked = unavailable();
      if (blocked) return blocked;
      const item = state.trash.find((t) => t.workout.id === id);
      if (!item) return fail("not-found", "Niet gevonden in de prullenbak.");
      if (state.workouts.some((w) => w.id === id)) return fail("duplicate-id", "Er bestaat al een workout met dit id.");
      // Een volledig document zonder `deletedAt` vervangt het verwijderde document.
      return commit([{ id, data: toDoc(item.workout) }], {
        workouts: [item.workout, ...state.workouts],
        trash: state.trash.filter((t) => t.workout.id !== id),
      });
    },

    async importWorkouts(items): Promise<ImportResult> {
      await ensureListening();
      const noOutcome = { imported: 0, skippedDuplicates: 0, conflicts: 0, invalid: 0, warnings: [] as string[] };
      const blocked = unavailable();
      if (blocked) return { ...blocked, ...noOutcome };

      const warnings: string[] = [];
      const { workouts: v1Workouts, logs } = splitLegacyAndWorkouts(items);
      const results: NormalizeResult[] = [...v1Workouts.map((w) => normalizeWorkout(w)), ...migrateLegacyLogs(logs)];

      const known = new Map(state.workouts.map((w) => [w.id, w]));
      const trashed = new Set(state.trash.map((t) => t.workout.id));
      const toAdd: Workout[] = [];
      const seen = new Set<string>();
      let skippedDuplicates = 0;
      let conflicts = 0;
      let invalid = 0;

      for (const r of results) {
        if (!r.workout) {
          invalid++;
          warnings.push(`Item overgeslagen: ${r.issues.join("; ")}`);
          continue;
        }
        const w: Workout = { ...r.workout, userId: uid };
        const existing = known.get(w.id);
        if (existing || trashed.has(w.id) || seen.has(w.id)) {
          if (existing && JSON.stringify(stripMeta(existing)) === JSON.stringify(stripMeta(w))) skippedDuplicates++;
          else {
            conflicts++;
            warnings.push(`Workout ${w.id} bestaat al met andere inhoud en is niet overschreven.`);
          }
          continue;
        }
        seen.add(w.id);
        toAdd.push({ ...w, createdAt: w.createdAt ?? nowIso() });
      }

      if (toAdd.length === 0) {
        return { ok: true, workouts: state.workouts, trash: state.trash, imported: 0, skippedDuplicates, conflicts, invalid, warnings };
      }
      const committed = commit(
        toAdd.map((w) => ({ id: w.id, data: toDoc(w) })),
        { workouts: [...toAdd, ...state.workouts], trash: state.trash }
      );
      if (!committed.ok) return { ...committed, ...noOutcome, invalid, conflicts, skippedDuplicates, warnings };
      return { ...committed, imported: toAdd.length, skippedDuplicates, conflicts, invalid, warnings };
    },

    subscribe(listener) {
      void ensureListening();
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },

    dispose() {
      stopListening?.();
      stopListening = null;
      listeners.clear();
    },

    flushPending(timeoutMs = 5000) {
      return backend.flush(timeoutMs);
    },
  };
}
