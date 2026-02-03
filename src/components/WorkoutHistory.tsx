import { Workout, SetData } from "@/types/workout";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Dumbbell, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface WorkoutHistoryProps {
  workouts: Workout[];
}

export function WorkoutHistory({ workouts }: WorkoutHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (workouts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Nog geen workouts gelogd.</p>
        <p className="text-sm">Begin met je eerste workout!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {workouts.map((workout) => (
        <div
          key={workout.id}
          className="rounded-xl gradient-card border border-border overflow-hidden"
        >
          {/* Workout Header */}
          <div
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-colors"
            onClick={() =>
              setExpandedId(expandedId === workout.id ? null : workout.id)
            }
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Dumbbell className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {workout.exercises.length} oefening
                  {workout.exercises.length !== 1 ? "en" : ""}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(workout.date), "EEEE d MMMM", { locale: nl })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {workout.totalVolume.toLocaleString()} kg
                </p>
                <p className="text-xs text-muted-foreground">totaal volume</p>
              </div>
              {expandedId === workout.id ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Expanded Content */}
          {expandedId === workout.id && (
            <div className="px-4 pb-4 space-y-3">
              {workout.exercises.map((exercise, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-secondary/50 border border-border/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-foreground">
                      {exercise.exercise}
                    </h4>
                    <span className="text-xs text-primary font-medium">
                      1RM: {exercise.estimated1RM}kg
                    </span>
                  </div>

                  {/* Sets */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {exercise.sets.map((set, setIdx) => (
                      <span
                        key={setIdx}
                        className="px-2 py-0.5 rounded bg-muted text-xs"
                      >
                        {set.weight}kg × {set.reps}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Volume: {exercise.volume.toLocaleString()}kg</span>
                  </div>

                  {exercise.notes && (
                    <p className="mt-2 text-xs text-muted-foreground italic">
                      "{exercise.notes}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
