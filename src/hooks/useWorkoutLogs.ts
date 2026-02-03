import { useState, useEffect } from "react";
import { WorkoutLog } from "@/types/workout";

const STORAGE_KEY = "fitness-coach-logs";

export function useWorkoutLogs() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setLogs(JSON.parse(stored));
    }
  }, []);

  const addLog = (log: WorkoutLog) => {
    const newLogs = [log, ...logs];
    setLogs(newLogs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newLogs));
  };

  const getExercisePR = (exercise: string): WorkoutLog | null => {
    const exerciseLogs = logs.filter(
      (log) => log.exercise.toLowerCase() === exercise.toLowerCase()
    );
    if (exerciseLogs.length === 0) return null;
    return exerciseLogs.reduce((max, log) =>
      log.estimated1RM > max.estimated1RM ? log : max
    );
  };

  const getRecentLogs = (limit: number = 10): WorkoutLog[] => {
    return logs.slice(0, limit);
  };

  return { logs, addLog, getExercisePR, getRecentLogs };
}
