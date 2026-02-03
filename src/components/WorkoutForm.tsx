import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dumbbell, Plus } from "lucide-react";

interface WorkoutFormProps {
  onSubmit: (data: {
    exercise: string;
    weight: number;
    reps: number;
    sets: number;
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
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [sets, setSets] = useState("3");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exercise || !weight || !reps || !sets) return;

    onSubmit({
      exercise,
      weight: parseFloat(weight),
      reps: parseInt(reps),
      sets: parseInt(sets),
      notes: notes || undefined,
    });

    // Reset form
    setExercise("");
    setWeight("");
    setReps("");
    setSets("3");
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

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="weight" className="text-foreground/80">
            Gewicht (kg)
          </Label>
          <Input
            id="weight"
            type="number"
            step="0.5"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="80"
            className="bg-secondary border-border focus:ring-primary"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sets" className="text-foreground/80">
            Sets
          </Label>
          <Input
            id="sets"
            type="number"
            value={sets}
            onChange={(e) => setSets(e.target.value)}
            placeholder="3"
            className="bg-secondary border-border focus:ring-primary"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reps" className="text-foreground/80">
            Reps
          </Label>
          <Input
            id="reps"
            type="number"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="8"
            className="bg-secondary border-border focus:ring-primary"
            required
          />
        </div>
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
