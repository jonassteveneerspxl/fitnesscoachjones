import { WorkoutLog, SetData } from "@/types/workout";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Dumbbell, Calendar } from "lucide-react";

interface WorkoutHistoryProps {
  logs: WorkoutLog[];
}

// Helper to handle old data format
function getSetsArray(log: WorkoutLog): SetData[] {
  if (Array.isArray(log.sets)) {
    return log.sets;
  }
  // Old format: sets was a number, we need to reconstruct
  const oldLog = log as unknown as { sets: number; reps: number; weight: number };
  return Array.from({ length: oldLog.sets || 1 }, () => ({
    weight: oldLog.weight || 0,
    reps: oldLog.reps || 0,
  }));
}

export function WorkoutHistory({ logs }: WorkoutHistoryProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Nog geen workouts gelogd.</p>
        <p className="text-sm">Begin met je eerste oefening!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div
          key={log.id}
          className="p-4 rounded-xl gradient-card border border-border hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-foreground">{log.exercise}</h4>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {format(new Date(log.date), "d MMM", { locale: nl })}
            </div>
          </div>

          {/* Sets breakdown */}
          <div className="flex flex-wrap gap-2 mb-3">
            {getSetsArray(log).map((set, idx) => (
              <div
                key={idx}
                className="px-2 py-1 rounded-md bg-muted text-sm"
              >
                <span className="text-muted-foreground">Set {idx + 1}:</span>{" "}
                <span className="font-medium text-foreground">
                  {set.weight}kg × {set.reps}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 pt-2 border-t border-border/50">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Vol:</span>
              <span className="text-sm font-medium text-foreground">
                {log.volume.toLocaleString()} kg
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Beste 1RM:</span>
              <span className="text-sm font-medium text-primary">
                {log.estimated1RM} kg
              </span>
            </div>
          </div>

          {log.notes && (
            <p className="mt-2 text-xs text-muted-foreground italic">
              "{log.notes}"
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
