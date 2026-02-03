import { useState, useEffect } from "react";
import { Workout, WorkoutLog } from "@/types/workout";

const STORAGE_KEY = "fitness-coach-workouts";

export function useWorkoutLogs() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Check if it's the new format (array of Workouts with exercises)
        if (parsed.length > 0 && parsed[0].exercises) {
          setWorkouts(parsed);
        } else {
          // Migrate old format (array of WorkoutLogs) to new format
          const migrated = migrateOldLogs(parsed);
          setWorkouts(migrated);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        }
      } catch {
        setWorkouts([]);
      }
    }
  }, []);

  const migrateOldLogs = (oldLogs: WorkoutLog[]): Workout[] => {
    // Group old logs by date (same day = same workout)
    const grouped = oldLogs.reduce((acc, log) => {
      const dateKey = new Date(log.date).toDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(log);
      return acc;
    }, {} as Record<string, WorkoutLog[]>);

    return Object.entries(grouped).map(([_, logs]) => ({
      id: logs[0].id,
      userId: logs[0].userId,
      date: logs[0].date,
      exercises: logs.map((log) => ({
        exercise: log.exercise,
        sets: Array.isArray(log.sets) ? log.sets : [],
        notes: log.notes,
        volume: log.volume || 0,
        estimated1RM: log.estimated1RM || 0,
      })),
      totalVolume: logs.reduce((sum, log) => sum + (log.volume || 0), 0),
    }));
  };

  const addWorkout = (workout: Workout) => {
    const newWorkouts = [workout, ...workouts];
    setWorkouts(newWorkouts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newWorkouts));
  };

  const getRecentWorkouts = (limit: number = 10): Workout[] => {
    return workouts.slice(0, limit);
  };

  return { workouts, addWorkout, getRecentWorkouts };
}
