import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, ChevronDown, ChevronUp, Dumbbell } from "lucide-react";
import { SetData, ExerciseLog } from "@/types/workout";
import { calculateVolumeFromSets, getBest1RMFromSets } from "@/utils/fitnessCalculations";
import { ExerciseSelector } from "@/components/ExerciseSelector";
import { WorkoutTemplateSelector } from "@/components/WorkoutTemplateSelector";
import { WorkoutTemplate } from "@/data/workoutTemplates";

interface ExerciseFormData {
  exercise: string;
  sets: { weight: string; reps: string }[];
  notes: string;
  isExpanded: boolean;
}

interface WorkoutFormProps {
  onSubmit: (exercises: ExerciseLog[]) => void;
  isLoading?: boolean;
}

const createEmptyExercise = (): ExerciseFormData => ({
  exercise: "",
  sets: [{ weight: "", reps: "" }],
  notes: "",
  isExpanded: true,
});

export function WorkoutForm({ onSubmit, isLoading }: WorkoutFormProps) {
  const [exercises, setExercises] = useState<ExerciseFormData[]>([
    createEmptyExercise(),
  ]);

  const addExercise = () => {
    // Collapse all other exercises
    const updated = exercises.map((ex) => ({ ...ex, isExpanded: false }));
    setExercises([...updated, createEmptyExercise()]);
  };

  const removeExercise = (index: number) => {
    if (exercises.length > 1) {
      setExercises(exercises.filter((_, i) => i !== index));
    }
  };

  const toggleExpand = (index: number) => {
    setExercises(
      exercises.map((ex, i) =>
        i === index ? { ...ex, isExpanded: !ex.isExpanded } : ex
      )
    );
  };

  const updateExercise = (
    index: number,
    field: keyof ExerciseFormData,
    value: string | boolean
  ) => {
    const updated = [...exercises];
    (updated[index] as any)[field] = value;
    setExercises(updated);
  };

  const addSet = (exerciseIndex: number) => {
    const updated = [...exercises];
    const lastSet = updated[exerciseIndex].sets.at(-1);
    updated[exerciseIndex].sets.push({
      weight: lastSet?.weight || "",
      reps: "",
    });
    setExercises(updated);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...exercises];
    if (updated[exerciseIndex].sets.length > 1) {
      updated[exerciseIndex].sets = updated[exerciseIndex].sets.filter(
        (_, i) => i !== setIndex
      );
      setExercises(updated);
    }
  };

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: "weight" | "reps",
    value: string
  ) => {
    const updated = [...exercises];
    updated[exerciseIndex].sets[setIndex][field] = value;
    setExercises(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validExercises: ExerciseLog[] = exercises
      .filter((ex) => ex.exercise.trim())
      .map((ex) => {
        const validSets = ex.sets
          .filter((s) => s.weight && s.reps)
          .map((s) => ({
            weight: parseFloat(s.weight),
            reps: parseInt(s.reps),
          }));

        return {
          exercise: ex.exercise,
          sets: validSets,
          notes: ex.notes || undefined,
          volume: calculateVolumeFromSets(validSets),
          estimated1RM: getBest1RMFromSets(validSets),
        };
      })
      .filter((ex) => ex.sets.length > 0);

    if (validExercises.length === 0) return;

    onSubmit(validExercises);

    // Reset form
    setExercises([createEmptyExercise()]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {exercises.map((exercise, exIndex) => (
        <div
          key={exIndex}
          className="rounded-xl border border-border bg-secondary/30 overflow-hidden"
        >
          {/* Exercise Header */}
          <div
            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
            onClick={() => toggleExpand(exIndex)}
          >
            <div className="p-2 rounded-lg bg-primary/20">
              <Dumbbell className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">
                {exercise.exercise || `Oefening ${exIndex + 1}`}
              </p>
              {!exercise.isExpanded && exercise.sets.some((s) => s.weight) && (
                <p className="text-xs text-muted-foreground">
                  {exercise.sets.filter((s) => s.weight && s.reps).length} sets
                </p>
              )}
            </div>
            {exercises.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeExercise(exIndex);
                }}
                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {exercise.isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>

          {/* Exercise Content */}
          {exercise.isExpanded && (
            <div className="p-4 pt-0 space-y-4">
              {/* Exercise Name */}
              <div className="space-y-2">
                <ExerciseSelector
                  value={exercise.exercise}
                  onChange={(value) => updateExercise(exIndex, "exercise", value)}
                  placeholder="Selecteer oefening"
                />
              </div>

              {/* Sets */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Sets</Label>
                {exercise.sets.map((set, setIndex) => (
                  <div key={setIndex} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                      {setIndex + 1}
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.5"
                          value={set.weight}
                          onChange={(e) =>
                            updateSet(exIndex, setIndex, "weight", e.target.value)
                          }
                          placeholder="Gewicht"
                          className="bg-background border-border pr-8 text-sm"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          kg
                        </span>
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          value={set.reps}
                          onChange={(e) =>
                            updateSet(exIndex, setIndex, "reps", e.target.value)
                          }
                          placeholder="Reps"
                          className="bg-background border-border pr-10 text-sm"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          reps
                        </span>
                      </div>
                    </div>
                    {exercise.sets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSet(exIndex, setIndex)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addSet(exIndex)}
                  className="w-full border border-dashed border-border hover:border-primary hover:bg-primary/10 text-muted-foreground"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Set toevoegen
                </Button>
              </div>

              {/* Notes */}
              <Textarea
                value={exercise.notes}
                onChange={(e) =>
                  updateExercise(exIndex, "notes", e.target.value)
                }
                placeholder="Opmerkingen (optioneel)"
                className="bg-background border-border resize-none text-sm"
                rows={2}
              />
            </div>
          )}
        </div>
      ))}

      {/* Add Exercise Button */}
      <Button
        type="button"
        variant="outline"
        onClick={addExercise}
        className="w-full border-dashed border-border hover:border-primary hover:bg-primary/10"
      >
        <Plus className="w-4 h-4 mr-2" />
        Oefening toevoegen
      </Button>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full gradient-primary text-primary-foreground font-semibold py-6 text-lg hover:opacity-90 transition-opacity"
      >
        <Dumbbell className="w-5 h-5 mr-2" />
        Workout Opslaan
      </Button>
    </form>
  );
}
