import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MuscleGroup, muscleGroupLabels } from "@/data/exercises";
import { useExerciseCatalog } from "@/context/ExerciseCatalogContext";
import { MAX_EQUIPMENT, MAX_NAME } from "@/utils/customExercises";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Voorgestelde naam, bv. wat je net in het zoekveld typte. */
  initialName?: string;
  onAdded: (name: string) => void;
}

export function AddExerciseDialog({ open, onOpenChange, initialName = "", onAdded }: Props) {
  const { addExercise } = useExerciseCatalog();
  const [name, setName] = useState(initialName);
  const [muscle, setMuscle] = useState<MuscleGroup | "">("");
  const [equipment, setEquipment] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setMuscle("");
      setEquipment("");
      setError(null);
    }
  }, [open, initialName]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // dit formulier staat in een dialog binnen het workoutformulier
    const result = addExercise({ name, muscleGroup: muscle, equipment });
    if (!result.ok || !result.exercise) {
      setError(result.message ?? "Toevoegen is mislukt.");
      return;
    }
    toast.success(`"${result.exercise.name}" toegevoegd aan je oefeningen.`);
    onOpenChange(false);
    onAdded(result.exercise.name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Eigen oefening toevoegen</DialogTitle>
          <DialogDescription>Handig voor een andere machine of variant. Hij staat daarna in je lijst, op al je toestellen.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ex-name">Naam</Label>
            <Input id="ex-name" value={name} maxLength={MAX_NAME} onChange={(e) => setName(e.target.value)} placeholder="Bijv. Pec Deck Fly" autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label>Spiergroep</Label>
            <Select value={muscle} onValueChange={(v) => setMuscle(v as MuscleGroup)}>
              <SelectTrigger aria-label="Spiergroep">
                <SelectValue placeholder="Kies een spiergroep" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(muscleGroupLabels) as MuscleGroup[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {muscleGroupLabels[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ex-equipment">Apparaat (optioneel)</Label>
            <Input id="ex-equipment" value={equipment} maxLength={MAX_EQUIPMENT} onChange={(e) => setEquipment(e.target.value)} placeholder="Bijv. Machine, Kabel, Barbell" autoComplete="off" />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit">Toevoegen</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
