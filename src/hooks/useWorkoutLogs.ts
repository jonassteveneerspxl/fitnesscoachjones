import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOptionalRepository } from "@/context/RepositoryContext";
import { TrashedWorkout, Workout } from "@/types/workout";
import {
  ImportResult,
  LoadStatus,
  MutationResult,
  WorkoutChanges,
  WorkoutRepository,
  createLocalStorageRepository,
} from "@/utils/workoutStorage";

export interface StorageInfo {
  status: LoadStatus;
  warnings: string[];
  readOnly: boolean;
}

/**
 * Workouts lezen en wijzigen via een `WorkoutRepository` (standaard localStorage).
 * Alle wijzigingen gaan via de repository, die vóór elke schrijfactie de actuele opslag leest.
 */
export function useWorkoutLogs(repository?: WorkoutRepository) {
  // Voorrang: expliciet meegegeven repository, dan die van de ingelogde gebruiker, anders localStorage.
  const accountRepository = useOptionalRepository();
  const repo = useMemo(
    () => repository ?? accountRepository ?? createLocalStorageRepository(),
    [repository, accountRepository]
  );
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [trash, setTrash] = useState<TrashedWorkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    status: "empty",
    warnings: [],
    readOnly: false,
  });
  const mounted = useRef(true);

  const reload = useCallback(async () => {
    const result = await repo.load();
    if (!mounted.current) return;
    setWorkouts(result.workouts);
    setTrash(result.trash);
    setStorageInfo({ status: result.status, warnings: result.warnings, readOnly: result.readOnly });
    setIsLoading(false);
  }, [repo]);

  useEffect(() => {
    mounted.current = true;
    void reload();
    const unsubscribe = repo.subscribe(() => void reload());
    return () => {
      mounted.current = false;
      unsubscribe();
    };
  }, [repo, reload]);

  const apply = useCallback(
    <T extends MutationResult>(result: T): T => {
      if (mounted.current) {
        setWorkouts(result.workouts);
        setTrash(result.trash);
      }
      return result;
    },
    []
  );

  const addWorkout = useCallback(async (workout: Workout) => apply(await repo.add(workout)), [repo, apply]);
  const updateWorkout = useCallback(
    async (id: string, changes: WorkoutChanges) => apply(await repo.update(id, changes)),
    [repo, apply]
  );
  const deleteWorkout = useCallback(async (id: string) => apply(await repo.remove(id)), [repo, apply]);
  const restoreWorkout = useCallback(async (id: string) => apply(await repo.restore(id)), [repo, apply]);
  const importWorkouts = useCallback(
    async (items: unknown[]): Promise<ImportResult> => apply(await repo.importWorkouts(items)),
    [repo, apply]
  );

  const getRecentWorkouts = (limit: number = 10): Workout[] => workouts.slice(0, limit);

  return {
    workouts,
    trash,
    isLoading,
    storageInfo,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    restoreWorkout,
    importWorkouts,
    getRecentWorkouts,
    reload,
  };
}
