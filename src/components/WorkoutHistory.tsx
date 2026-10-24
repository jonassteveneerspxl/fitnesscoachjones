import { Workout } from "@/types/workout";
import { Dumbbell, Calendar, ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { describeWorkoutMoment } from "@/utils/dates";

interface WorkoutHistoryProps {
  workouts: Workout[];
  /** Zonder deze handlers is de lijst alleen-lezen (bv. op de statistiekenpagina). */
  onEdit?: (workout: Workout) => void;
  onDelete?: (workout: Workout) => void;
}

export function WorkoutHistory({ workouts, onEdit, onDelete }: WorkoutHistoryProps) {
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
            <div className="flex items-center gap-3 min-w-0">
              <div className="hidden sm:block p-2 rounded-lg bg-primary/20">
                <Dumbbell className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground whitespace-nowrap">
                    {workout.exercises.length} oefening
                    {workout.exercises.length !== 1 ? "en" : ""}
                  </p>
                  {workout.trainingType !== "Onbekend" && (
                    <Badge variant="outline" className="text-xs">
                      {workout.trainingType}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3 shrink-0" />
                  {describeWorkoutMoment(workout.startedAt, workout.timeZone) ?? "Datum onbekend"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground whitespace-nowrap">
                  {workout.totalVolume.toLocaleString()} kg
                </p>
                <p className="hidden sm:block text-xs text-muted-foreground">totaal volume</p>
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

              {(onEdit || onDelete) && (
                <div className="flex gap-2 pt-1">
                  {onEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(workout)}
                      aria-label="Workout bewerken"
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Bewerken
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(workout)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Workout verwijderen"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Verwijderen
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
