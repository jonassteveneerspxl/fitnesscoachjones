import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ImportResult, createLocalStorageRepository } from "@/utils/workoutStorage";

interface Props {
  onImport: (items: unknown[]) => Promise<ImportResult>;
  disabled?: boolean;
}

/**
 * Biedt aan om workouts die vóór het inloggen in deze browser stonden naar het account te kopiëren.
 * Alleen kopiëren: de lokale gegevens worden nooit gewijzigd of verwijderd, en opnieuw kopiëren maakt geen dubbelen.
 */
export function LocalDataTransfer({ onImport, disabled }: Props) {
  const [localWorkouts, setLocalWorkouts] = useState<unknown[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void createLocalStorageRepository()
      .load()
      .then((r) => {
        if (active) setLocalWorkouts(r.workouts);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (localWorkouts.length === 0) return null;

  const copy = async () => {
    setBusy(true);
    try {
      const result = await onImport(localWorkouts);
      if (!result.ok) {
        toast.error(result.message ?? "Kopiëren mislukt.");
        return;
      }
      toast.success(`${result.imported} workout${result.imported === 1 ? "" : "s"} naar je account gekopieerd.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Alert className="mb-4">
      <AlertTitle>Workouts gevonden op dit toestel</AlertTitle>
      <AlertDescription>
        <p className="text-xs">
          Er staan {localWorkouts.length} workout{localWorkouts.length === 1 ? "" : "s"} in deze browser van vóór het
          inloggen. Je kunt ze naar je account kopiëren. Er wordt niets verwijderd en opnieuw kopiëren maakt geen dubbelen.
        </p>
        <Button type="button" size="sm" className="mt-2" disabled={busy || disabled} onClick={() => void copy()}>
          Kopieer naar mijn account
        </Button>
      </AlertDescription>
    </Alert>
  );
}
