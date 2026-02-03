import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, X } from "lucide-react";
import { SetData } from "@/types/workout";

interface WorkoutFormProps {
  onSubmit: (data: {
    exercise: string;
    sets: SetData[];
    notes?: string;
  }) => void;
  isLoading?: boolean;
}

const popularExercises = [
  "Bench Press",
  "Squat",
  "Deadlift",
  "Shoulder Press",
  "Barbell Row",
  "Pull-ups",
];

export function WorkoutForm({ onSubmit, isLoading }: WorkoutFormProps) {
  const [exercise, setExercise] = useState("");
  const [sets, setSets] = useState<{ weight: string; reps: string }[]>([
    { weight: "", reps: "" },
  ]);
  const [notes, setNotes] = useState("");

  const addSet = () => {
    // Copy weight from last set for convenience
    const lastSet = sets[sets.length - 1];
    setSets([...sets, { weight: lastSet?.weight || "", reps: "" }]);
  };

  const removeSet = (index: number) => {
    if (sets.length > 1) {
      setSets(sets.filter((_, i) => i !== index));
    }
  };

  const updateSet = (index: number, field: "weight" | "reps", value: string) => {
    const newSets = [...sets];
    newSets[index][field] = value;
    setSets(newSets);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exercise) return;

    const validSets = sets
      .filter((s) => s.weight && s.reps)
      .map((s) => ({
        weight: parseFloat(s.weight),
        reps: parseInt(s.reps),
      }));

    if (validSets.length === 0) return;

    onSubmit({
      exercise,
      sets: validSets,
      notes: notes || undefined,
    });

    // Reset form
    setExercise("");
    setSets([{ weight: "", reps: "" }]);
    setNotes("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="exercise" className="text-foreground/80">
          Oefening
        </Label>
        <Input
          id="exercise"
          value={exercise}
          onChange={(e) => setExercise(e.target.value)}
          placeholder="Bijv. Bench Press"
          className="bg-secondary border-border focus:ring-primary"
          required
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {popularExercises.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setExercise(ex)}
              className="px-3 py-1 text-xs rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Sets */}
      <div className="space-y-3">
        <Label className="text-foreground/80">Sets</Label>
        
        {sets.map((set, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
              {index + 1}
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div className="relative">
                <Input
                  type="number"
                  step="0.5"
                  value={set.weight}
                  onChange={(e) => updateSet(index, "weight", e.target.value)}
                  placeholder="Gewicht"
                  className="bg-secondary border-border focus:ring-primary pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  kg
                </span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  value={set.reps}
                  onChange={(e) => updateSet(index, "reps", e.target.value)}
                  placeholder="Reps"
                  className="bg-secondary border-border focus:ring-primary pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  reps
                </span>
              </div>
            </div>
            {sets.length > 1 && (
              <button
                type="button"
                onClick={() => removeSet(index)}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={addSet}
          className="w-full border-dashed border-border hover:border-primary hover:bg-primary/10"
        >
          <Plus className="w-4 h-4 mr-2" />
          Set toevoegen
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-foreground/80">
          Opmerkingen (optioneel)
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Voelde licht, volgende keer meer gewicht..."
          className="bg-secondary border-border focus:ring-primary resize-none"
          rows={2}
        />
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full gradient-primary text-primary-foreground font-semibold py-6 text-lg hover:opacity-90 transition-opacity"
      >
        <Plus className="w-5 h-5 mr-2" />
        Log Workout
      </Button>
    </form>
  );
}
