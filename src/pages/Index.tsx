import { useState } from "react";
import { toast } from "sonner";
import { WorkoutForm } from "@/components/WorkoutForm";
import { CoachFeedback } from "@/components/CoachFeedback";
import { WorkoutHistory } from "@/components/WorkoutHistory";
import { AppHeader } from "@/components/AppHeader";
import { DataManager } from "@/components/DataManager";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOptionalAuth } from "@/context/AuthContext";
import { LocalDataTransfer } from "@/components/LocalDataTransfer";
import { useWorkoutLogs } from "@/hooks/useWorkoutLogs";
import { generateCoachResponse } from "@/utils/fitnessCalculations";
import { describeWorkoutMoment, getDeviceTimeZone } from "@/utils/dates";
import { generateId } from "@/utils/ids";
import { CoachResponse, Workout, ExerciseLog, TrainingType } from "@/types/workout";
import { History, Sparkles, Database } from "lucide-react";

const Index = () => {
  const auth = useOptionalAuth();
  const {
    workouts,
    isLoading,
    storageInfo,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    restoreWorkout,
    importWorkouts,
    getRecentWorkouts,
  } = useWorkoutLogs();
  const [coachResponse, setCoachResponse] = useState<CoachResponse | null>(null);
  const [editing, setEditing] = useState<Workout | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Workout | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [dismissedWarnings, setDismissedWarnings] = useState(false);

  const handleWorkoutSubmit = async (
    exercises: ExerciseLog[],
    meta: { trainingType: TrainingType }
  ): Promise<boolean> => {
    const response = generateCoachResponse(exercises, workouts);
    const now = new Date();
    const newWorkout: Workout = {
      id: generateId(),
      userId: auth?.user?.uid ?? "user-1", // met een account zet de repository dit sowieso op de uid
      date: now.toISOString(),
      startedAt: now.toISOString(),
      timeZone: getDeviceTimeZone(),
      trainingType: meta.trainingType,
      exercises,
      totalVolume: response.totalVolume,
    };

    const result = await addWorkout(newWorkout);
    if (!result.ok) {
      toast.error(result.message ?? "Opslaan mislukt. Je workout staat nog in het formulier.");
      return false;
    }
    setCoachResponse(response);
    return true;
  };

  const handleEditSubmit = async (
    exercises: ExerciseLog[],
    meta: { trainingType: TrainingType }
  ): Promise<boolean> => {
    if (!editing) return false;
    const result = await updateWorkout(editing.id, {
      trainingType: meta.trainingType,
      exercises,
    });
    if (!result.ok) {
      toast.error(result.message ?? "Wijzigen mislukt.");
      return false;
    }
    toast.success("Workout bijgewerkt.");
    setEditing(null);
    return true;
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    const result = await deleteWorkout(target.id);
    if (!result.ok) {
      toast.error(result.message ?? "Verwijderen mislukt.");
      return;
    }
    toast("Workout verwijderd.", {
      duration: 10000,
      action: {
        label: "Ongedaan maken",
        onClick: async () => {
          const restored = await restoreWorkout(target.id);
          if (restored.ok) toast.success("Workout hersteld.");
          else toast.error(restored.message ?? "Herstellen mislukt.");
        },
      },
    });
  };

  const visibleWorkouts = showAll ? workouts : getRecentWorkouts(5);
  const hasStorageProblem =
    storageInfo.status === "corrupt" ||
    storageInfo.status === "unsupported" ||
    storageInfo.status === "legacy-unreadable" ||
    storageInfo.status === "unavailable";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container max-w-2xl py-6 space-y-8">
        {(hasStorageProblem || storageInfo.warnings.length > 0) && !dismissedWarnings && (
          <Alert variant={storageInfo.readOnly || hasStorageProblem ? "destructive" : "default"}>
            <AlertTitle>
              {storageInfo.readOnly ? "Opslag is alleen-lezen" : "Let op bij het laden van je gegevens"}
            </AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4 text-xs space-y-0.5">
                {storageInfo.warnings.slice(0, 5).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
              <p className="text-xs mt-2">Er is niets verwijderd; de originele gegevens blijven bewaard.</p>
              <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setDismissedWarnings(true)}>
                Sluiten
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Workout Form Card */}
        <section className="p-6 rounded-2xl gradient-card border border-border">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Nieuwe Workout</h2>
          </div>
          <WorkoutForm
            onSubmit={handleWorkoutSubmit}
            isLoading={isLoading || storageInfo.readOnly}
          />
        </section>

        {/* Coach Feedback */}
        {coachResponse && <CoachFeedback response={coachResponse} />}

        {/* Workout History */}
        <section className="p-6 rounded-2xl gradient-card border border-border">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {showAll ? "Alle Workouts" : "Recente Workouts"}
            </h2>
          </div>
          <WorkoutHistory
            workouts={visibleWorkouts}
            onEdit={storageInfo.readOnly ? undefined : setEditing}
            onDelete={storageInfo.readOnly ? undefined : setPendingDelete}
          />
          {workouts.length > 5 && (
            <Button
              type="button"
              variant="ghost"
              className="w-full mt-4"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "Toon alleen recente workouts" : `Toon alle ${workouts.length} workouts`}
            </Button>
          )}
        </section>

        {/* Data */}
        <section className="p-6 rounded-2xl gradient-card border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Gegevens</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {auth?.user
              ? "Je workouts staan in je account en zijn op elk toestel beschikbaar waar je inlogt. Exporteren kan nog steeds als extra back-up."
              : "Je workouts staan alleen in deze browser. Exporteer ze regelmatig als back-up of om ze naar een ander toestel mee te nemen."}
          </p>
          {auth?.user && <LocalDataTransfer onImport={importWorkouts} disabled={storageInfo.readOnly} />}
          <DataManager workouts={workouts} onImport={importWorkouts} disabled={storageInfo.readOnly} />
        </section>
      </main>

      {/* Bewerken */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Workout bewerken</DialogTitle>
          </DialogHeader>
          {editing && (
            <WorkoutForm
              key={editing.id}
              initialWorkout={editing}
              onSubmit={handleEditSubmit}
              submitLabel="Wijzigingen Opslaan"
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Verwijderen met bevestiging */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Workout verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && (
                <>
                  {describeWorkoutMoment(pendingDelete.startedAt, pendingDelete.timeZone) ?? "Datum onbekend"}
                  {" · "}
                  {pendingDelete.exercises.length} oefening{pendingDelete.exercises.length !== 1 ? "en" : ""}
                  {" · "}
                  {pendingDelete.totalVolume.toLocaleString()} kg. Deze workout verdwijnt uit je overzicht en
                  statistieken. Direct daarna kun je het nog ongedaan maken.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Verwijderen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
