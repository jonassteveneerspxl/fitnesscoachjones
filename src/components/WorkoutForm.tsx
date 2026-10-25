import { useEffect, useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, ChevronDown, ChevronUp, Dumbbell, Check } from "lucide-react";
import {
  ExerciseLog,
  SELECTABLE_TRAINING_TYPES,
  TrainingType,
  Workout,
} from "@/types/workout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { calculateVolumeFromSets, getBest1RMFromSets } from "@/utils/fitnessCalculations";
import { ExerciseSelector } from "@/components/ExerciseSelector";
import { WorkoutTemplateSelector } from "@/components/WorkoutTemplateSelector";
import { WorkoutTemplate } from "@/data/workoutTemplates";
import { clearDraft, draftKeyFor, loadDraft, saveDraft } from "@/utils/workoutDraft";
import { useOptionalAuth } from "@/context/AuthContext";
import { getBrowserStorage } from "@/utils/workoutStorage";
import { DEFAULT_REST_SECONDS, RestTimer } from "@/components/RestTimer";
import { LastPerformance, findLastPerformance, findLastWorkout } from "@/utils/lastPerformance";
import { describeWorkoutMoment } from "@/utils/dates";

interface ExerciseFormData {
  exercise: string;
  sets: FormSet[];
  notes: string;
  isExpanded: boolean;
}

interface WorkoutFormProps {
  /** Geeft `false` terug (of een Promise daarvan) als opslaan mislukt: het formulier blijft dan gevuld. */
  onSubmit: (
    exercises: ExerciseLog[],
    meta: { trainingType: TrainingType }
  ) => void | boolean | Promise<void | boolean>;
  isLoading?: boolean;
  /** Bewerkmodus: vult het formulier met een bestaande workout. */
  initialWorkout?: Workout;
  submitLabel?: string;
  onCancel?: () => void;
  /** Eerdere workouts: daaruit komt de "vorige keer" per oefening (alleen bij een nieuwe workout). */
  history?: Workout[];
}

/** `done: false` = voorgesteld (vorige keer) maar nog niet afgevinkt; zulke sets worden niet opgeslagen. */
type FormSet = { weight: string; reps: string; done?: false | true };

const setsFromLast = (last: LastPerformance): FormSet[] =>
  last.sets.map((s) => ({ weight: String(s.weight), reps: String(s.reps), done: false as const }));

const sameSets = (a: FormSet[], b: FormSet[]) =>
  a.length === b.length && a.every((s, i) => s.weight === b[i].weight && s.reps === b[i].reps);

const nlNumber = (n: number) => n.toLocaleString("nl-BE", { maximumFractionDigits: 1 });

const createEmptyExercise = (): ExerciseFormData => ({
  exercise: "",
  sets: [{ weight: "", reps: "" }],
  notes: "",
  isExpanded: true,
});

const createFormDataFromWorkout = (workout: Workout): ExerciseFormData[] =>
  workout.exercises.map((ex, index) => ({
    exercise: ex.exercise,
    sets: ex.sets.map((s) => ({ weight: String(s.weight), reps: String(s.reps) })),
    notes: ex.notes ?? "",
    isExpanded: index === 0,
  }));

export function WorkoutForm({
  onSubmit,
  isLoading,
  initialWorkout,
  submitLabel,
  onCancel,
  history = [],
}: WorkoutFormProps) {
  const isEditing = !!initialWorkout;
  const lastFor = (name: string): LastPerformance | null => (isEditing ? null : findLastPerformance(history, name));
  const draftKey = draftKeyFor(useOptionalAuth()?.user?.uid);
  // Het concept van een lopende nieuwe workout wordt één keer gelezen bij het openen van het formulier, vóór de
  // eerste render. Zo kan de autosave hieronder het bewaarde concept nooit met een leeg formulier overschrijven.
  // In bewerkmodus wordt het concept niet gebruikt en niet aangeraakt.
  const [restoredDraft] = useState(() => (initialWorkout ? null : loadDraft(getBrowserStorage(), draftKey)));
  const [draftNoticeFrom, setDraftNoticeFrom] = useState<string | null>(restoredDraft?.savedAt ?? null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [exercises, setExercises] = useState<ExerciseFormData[]>(() =>
    initialWorkout && initialWorkout.exercises.length > 0
      ? createFormDataFromWorkout(initialWorkout)
      : restoredDraft
        ? restoredDraft.exercises
        : [createEmptyExercise()]
  );
  const [trainingType, setTrainingType] = useState<TrainingType>(
    initialWorkout ? initialWorkout.trainingType : (restoredDraft?.trainingType ?? "Custom")
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);

  // Bewaar het lopende formulier bij elke wijziging. Een leeg formulier (na opslaan of weggooien) wist het concept.
  useEffect(() => {
    if (isEditing) return;
    saveDraft(getBrowserStorage(), exercises, trainingType, new Date(), draftKey);
  }, [exercises, trainingType, isEditing, draftKey]);

  const discardDraft = () => {
    setExercises([createEmptyExercise()]);
    setTrainingType("Custom");
    setDraftNoticeFrom(null);
    setConfirmDiscard(false);
    clearDraft(getBrowserStorage(), draftKey);
  };

  const addExercise = () => {
    // Collapse all other exercises
    const updated = exercises.map((ex) => ({ ...ex, isExpanded: false }));
    setExercises([...updated, createEmptyExercise()]);
  };

  const loadTemplate = (template: WorkoutTemplate) => {
    setTrainingType(template.category);
    const templateExercises: ExerciseFormData[] = template.exercises.map(
      (ex, index) => {
        const last = lastFor(ex.exercise);
        return {
        exercise: ex.exercise,
        // Met geschiedenis: begin bij wat je vorige keer deed. Anders lege sets volgens het template.
        sets: last
          ? setsFromLast(last)
          : Array.from({ length: ex.suggestedSets }, () => ({
              weight: "",
              reps: "",
            })),
        notes: "",
        isExpanded: index === 0, // Only first exercise expanded
        };
      }
    );
    setExercises(templateExercises);
  };

  /** Snelstart: dezelfde oefeningen als de laatste workout van dit type, met de sets van de vorige keer als voorstel. */
  const startFromLast = (workout: Workout) => {
    setTrainingType(workout.trainingType);
    setExercises(
      workout.exercises.map((ex, index) => {
        const last = lastFor(ex.exercise);
        return {
          exercise: ex.exercise,
          sets: last ? setsFromLast(last) : [{ weight: "", reps: "" }],
          notes: "",
          isExpanded: index === 0,
        };
      })
    );
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
    field: "exercise" | "notes" | "isExpanded",
    value: string | boolean
  ) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  /**
   * Kiest een oefening. Zijn de sets nog leeg (of nog precies de overgenomen waarden van de vorige oefening),
   * dan worden ze gevuld met wat je vorige keer deed. Wat je zelf hebt ingevuld wordt nooit overschreven.
   */
  const selectExercise = (index: number, value: string) => {
    const current = exercises[index];
    const lastOld = lastFor(current.exercise);
    const lastNew = lastFor(value);
    const untouched = !current.sets.some(isFilled);
    const isOldPrefill =
      !!lastOld && current.sets.every((st) => st.done === false) && sameSets(current.sets, setsFromLast(lastOld));
    let sets = current.sets;
    if (lastNew && (untouched || isOldPrefill)) sets = setsFromLast(lastNew);
    else if (isOldPrefill) sets = [{ weight: "", reps: "" }];
    const updated = [...exercises];
    updated[index] = { ...current, exercise: value, sets };
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

  const toggleSetDone = (exerciseIndex: number, setIndex: number) => {
    const updated = [...exercises];
    const target = updated[exerciseIndex].sets[setIndex];
    const nowDone = target.done === false;
    target.done = nowDone ? true : false;
    setExercises(updated);
    // Een set afvinken start de rust. Alleen in een nieuwe workout, niet bij bewerken.
    if (nowDone && !isEditing) setRestEndsAt(Date.now() + DEFAULT_REST_SECONDS * 1000);
  };

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: "weight" | "reps",
    value: string
  ) => {
    const updated = [...exercises];
    const target = updated[exerciseIndex].sets[setIndex];
    target[field] = value;
    target.done = true; // zelf iets invullen of aanpassen telt als "gedaan"
    setExercises(updated);
  };

  const renderLastPerformance = (exIndex: number, exercise: ExerciseFormData) => {
    const last = lastFor(exercise.exercise);
    if (!last) return null;
    const day = describeWorkoutMoment(last.startedAt, last.timeZone)?.split(" · ")[0];
    const now = exercise.sets.filter(isValidSet).reduce((sum, st) => sum + Number(st.weight) * Number(st.reps), 0);
    const diff = now - last.volume;
    const lastSets = setsFromLast(last);
    return (
      <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-xs space-y-1" data-testid="last-performance">
        <p className="font-medium text-foreground">Vorige keer{day ? ` · ${day}` : ""}</p>
        <p className="text-muted-foreground">
          {last.sets.map((st) => `${nlNumber(st.weight)} kg × ${st.reps}`).join(" · ")}
        </p>
        <p className="text-muted-foreground">Volume: {nlNumber(last.volume)} kg</p>
        {now > 0 && (
          <p className={diff >= 0 ? "text-primary font-medium" : "text-muted-foreground"}>
            Nu: {nlNumber(now)} kg ·{" "}
            {diff > 0
              ? `+${nlNumber(diff)} kg boven vorige keer`
              : diff === 0
                ? "gelijk aan vorige keer"
                : `nog ${nlNumber(-diff)} kg te gaan om gelijk te komen`}
          </p>
        )}
        {!sameSets(exercise.sets, lastSets) && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => {
              const updated = [...exercises];
              updated[exIndex] = { ...exercise, sets: lastSets };
              setExercises(updated);
            }}
          >
            Vorige keer overnemen
          </Button>
        )}
      </div>
    );
  };

  const isFilled = (s: { weight: string; reps: string }) =>
    s.weight.trim() !== "" || s.reps.trim() !== "";
  const isValidSet = (s: { weight: string; reps: string }) => {
    const weight = Number(s.weight);
    const reps = Number(s.reps);
    return (
      s.weight.trim() !== "" &&
      s.reps.trim() !== "" &&
      Number.isFinite(weight) &&
      weight >= 0 &&
      Number.isInteger(reps) &&
      reps >= 1
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Gedeeltelijk ingevulde of ongeldige sets worden niet stilzwijgend weggegooid.
    const hasInvalidRows = exercises.some(
      (ex) => ex.exercise.trim() && ex.sets.some((s) => isFilled(s) && !isValidSet(s))
    );
    if (hasInvalidRows) {
      toast.error(
        "Controleer je sets: gewicht moet 0 of meer zijn en reps een geheel getal van minstens 1."
      );
      return;
    }

    const validExercises: ExerciseLog[] = exercises
      .filter((ex) => ex.exercise.trim())
      .map((ex) => {
        const validSets = ex.sets.filter((s) => s.done !== false).filter(isValidSet).map((s, index) => ({
          setNumber: index + 1,
          weight: Number(s.weight),
          reps: Number(s.reps),
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

    if (validExercises.length === 0) {
      if (exercises.some((ex) => ex.exercise.trim() && ex.sets.some((s) => s.done === false && isValidSet(s)))) {
        toast.error("Vink de sets af die je gedaan hebt, of pas ze aan, om op te slaan.");
      }
      return;
    }

    setIsSubmitting(true);
    let saved: void | boolean = false;
    try {
      saved = await onSubmit(validExercises, { trainingType });
    } finally {
      setIsSubmitting(false);
    }

    // Reset alleen na een geslaagde opslag in aanmaakmodus; bij een fout blijft alles staan.
    if (saved !== false && !isEditing) {
      setExercises([createEmptyExercise()]);
      setTrainingType("Custom");
      setDraftNoticeFrom(null);
      setRestEndsAt(null);
      clearDraft(getBrowserStorage(), draftKey);
    }
  };

  // De snelstart verschijnt alleen bij een leeg formulier, zodat hij nooit iets overschrijft wat je al hebt ingevuld.
  const formIsEmpty = exercises.every((ex) => !ex.exercise.trim() && !ex.notes.trim() && !ex.sets.some(isFilled));
  const quickStartTarget = !isEditing && formIsEmpty ? findLastWorkout(history, trainingType) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {draftNoticeFrom && !isEditing && (
        <Alert>
          <AlertTitle>Concept hersteld</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Je workout is teruggezet zoals je hem achterliet (laatst bewaard op{" "}
              {format(new Date(draftNoticeFrom), "EEEE d MMMM 'om' HH:mm", { locale: nl })}).
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setDraftNoticeFrom(null)}>
                Doorgaan
              </Button>
              <Button
                type="button"
                size="sm"
                variant="link"
                className="text-destructive"
                onClick={() => setConfirmDiscard(true)}
              >
                Concept weggooien
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concept weggooien?</AlertDialogTitle>
            <AlertDialogDescription>
              Alles wat je nu hebt ingevuld wordt gewist. Dit kun je niet ongedaan maken.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={discardDraft}>Weggooien</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Template Selector */}
      {quickStartTarget && (
        <Button
          type="button"
          variant="outline"
          className="w-full h-auto py-3 flex-col gap-0.5 border-primary/40 bg-primary/10 hover:bg-primary/20"
          onClick={() => startFromLast(quickStartTarget)}
        >
          <span className="font-semibold">
            {trainingType === "Custom" || trainingType === "Onbekend"
              ? "Zelfde als laatste workout"
              : `Zelfde als vorige ${trainingType}`}
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {quickStartTarget.trainingType !== "Onbekend" ? `${quickStartTarget.trainingType} · ` : ""}
            {describeWorkoutMoment(quickStartTarget.startedAt, quickStartTarget.timeZone)?.split(" · ")[0]} ·{" "}
            {quickStartTarget.exercises.length} oefening{quickStartTarget.exercises.length === 1 ? "" : "en"}
          </span>
        </Button>
      )}
      {!isEditing && <WorkoutTemplateSelector onSelectTemplate={loadTemplate} />}

      {/* Training type */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Trainingstype</Label>
        <Select
          value={trainingType}
          onValueChange={(value) => setTrainingType(value as TrainingType)}
        >
          <SelectTrigger className="bg-background border-border" aria-label="Trainingstype">
            <SelectValue placeholder="Kies een type" />
          </SelectTrigger>
          <SelectContent>
            {(trainingType === "Onbekend"
              ? (["Onbekend", ...SELECTABLE_TRAINING_TYPES] as TrainingType[])
              : SELECTABLE_TRAINING_TYPES
            ).map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
                  onChange={(value) => selectExercise(exIndex, value)}
                  placeholder="Selecteer oefening"
                />
                {renderLastPerformance(exIndex, exercise)}
              </div>

              {/* Sets */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Sets</Label>
                {exercise.sets.map((set, setIndex) => (
                  <div key={setIndex} className="flex items-center gap-2">
                    {(() => {
                      const checked = isValidSet(set) && set.done !== false;
                      return (
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={checked}
                          aria-label={`Set ${setIndex + 1} ${checked ? "afgevinkt" : "afvinken"}`}
                          disabled={!isValidSet(set)}
                          onClick={() => toggleSetDone(exIndex, setIndex)}
                          className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-xs font-medium transition-colors disabled:opacity-60 ${
                            checked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/20"
                          }`}
                        >
                          {checked ? <Check className="w-4 h-4" /> : setIndex + 1}
                        </button>
                      );
                    })()}
                    <div className="flex-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          inputMode="decimal"
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
                          step="1"
                          min="1"
                          inputMode="numeric"
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
                    {(() => {
                      const prev = lastFor(exercise.exercise)?.sets[setIndex];
                      return prev ? (
                        <p className="mt-0.5 text-[11px] text-muted-foreground" data-testid="previous-set">
                          Vorige: {nlNumber(prev.weight)} kg × {prev.reps}
                        </p>
                      ) : null;
                    })()}
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
        disabled={isLoading || isSubmitting}
        className="w-full gradient-primary text-primary-foreground font-semibold py-6 text-lg hover:opacity-90 transition-opacity"
      >
        <Dumbbell className="w-5 h-5 mr-2" />
        {submitLabel ?? "Workout Opslaan"}
      </Button>
      {onCancel && (
        <Button type="button" variant="ghost" onClick={onCancel} className="w-full">
          Annuleren
        </Button>
      )}
      {restEndsAt !== null && !isEditing && (
        <RestTimer endsAt={restEndsAt} onChange={setRestEndsAt} onClose={() => setRestEndsAt(null)} />
      )}
    </form>
  );
}
