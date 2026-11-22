import { useState, useMemo } from "react";
import { Check, ChevronDown, Search, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useBackToClose } from "@/hooks/useBackToClose";
import { useVisualViewport } from "@/hooks/useVisualViewport";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  muscleGroupLabels,
  pplLabels,
  type MuscleGroup,
  type PPLCategory,
  type Exercise,
} from "@/data/exercises";
import { useExerciseCatalog } from "@/context/ExerciseCatalogContext";
import { AddExerciseDialog } from "@/components/AddExerciseDialog";
import { searchIn } from "@/utils/customExercises";
import { Plus, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface ExerciseSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Scrolbare lijst die de beschikbare hoogte opvult; native scrollen werkt het best met aanraking. */
function ListArea({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">{children}</div>;
}

export function ExerciseSelector({
  value,
  onChange,
  placeholder = "Selecteer oefening",
}: ExerciseSelectorProps) {
  const [open, setOpen] = useState(false);
  useBackToClose(open, () => setOpen(false));
  const viewport = useVisualViewport(open);
  const isPhone = typeof window !== "undefined" && window.innerWidth < 640;
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"search" | "muscle" | "ppl">("search");
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
  const [selectedPPL, setSelectedPPL] = useState<PPLCategory | null>(null);
  const catalog = useExerciseCatalog();
  const exercises = catalog.all;
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [pendingRemove, setPendingRemove] = useState<Exercise | null>(null);
  const byMuscle = (m: MuscleGroup) => exercises.filter((e) => e.muscleGroup === m);
  const byPpl = (c: PPLCategory) => exercises.filter((e) => e.pplCategory === c);
  const customIds = useMemo(() => new Map(catalog.custom.map((c) => [c.name, c.id])), [catalog.custom]);

  const filteredExercises = useMemo(() => {
    if (activeTab === "search" && searchQuery) {
      return searchIn(exercises, searchQuery);
    }
    if (activeTab === "muscle" && selectedMuscle) {
      return exercises.filter((e) => e.muscleGroup === selectedMuscle);
    }
    if (activeTab === "ppl" && selectedPPL) {
      return exercises.filter((e) => e.pplCategory === selectedPPL);
    }
    return [];
  }, [exercises, activeTab, searchQuery, selectedMuscle, selectedPPL]);

  const openAdd = (name = "") => {
    setAddName(name);
    setOpen(false);
    setAddOpen(true);
  };

  const handleSelect = (exerciseName: string) => {
    onChange(exerciseName);
    setOpen(false);
    setSearchQuery("");
    setSelectedMuscle(null);
    setSelectedPPL(null);
  };

  const selectedExercise = exercises.find((e) => e.name === value);

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-background border-border hover:bg-secondary/50"
        >
          <div className="flex items-center gap-2 truncate">
            <Dumbbell className="h-4 w-4 shrink-0 text-muted-foreground" />
            {value ? (
              <span className="truncate">{value}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="p-0 gap-0 flex flex-col top-0 translate-y-0 rounded-t-none max-w-none sm:max-w-md sm:top-[8%] sm:rounded-lg sm:max-h-[640px]"
        style={isPhone ? { top: viewport.offsetTop, height: viewport.height } : undefined}
        onOpenAutoFocus={(e) => {
          // Zonder dit focust het venster de eerste tab; we focussen liever het zoekveld.
          e.preventDefault();
          (e.currentTarget as HTMLElement).querySelector<HTMLInputElement>("input")?.focus();
        }}
      >
        <DialogTitle className="sr-only">Oefening kiezen</DialogTitle>
        <DialogDescription className="sr-only">Zoek een oefening of kies per spiergroep of push, pull en legs.</DialogDescription>
        <Tabs className="flex flex-col flex-1 min-h-0" value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="w-full grid grid-cols-3 rounded-none border-b h-12 pr-10">
            <TabsTrigger value="search" className="text-xs">
              <Search className="h-3 w-3 mr-1" />
              Zoeken
            </TabsTrigger>
            <TabsTrigger value="muscle" className="text-xs">Spiergroep</TabsTrigger>
            <TabsTrigger value="ppl" className="text-xs">Push/Pull/Legs</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-0 flex-1 min-h-0 flex-col data-[state=active]:flex">
            <div className="p-2 border-b">
              <Input
                placeholder="Zoek oefening..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 text-base sm:text-sm"
                enterKeyHint="search"
                autoComplete="off"
              />
            </div>
            <ListArea>
              {searchQuery ? (
                filteredExercises.length > 0 ? (
                  <div className="p-1">
                    {filteredExercises.map((exercise) => (
                      <ExerciseItem
                        key={exercise.name}
                        exercise={exercise}
                        isSelected={value === exercise.name}
                        onSelect={handleSelect}
                        onRemove={customIds.has(exercise.name) ? setPendingRemove : undefined}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground space-y-2">
                    <p>Geen oefeningen gevonden</p>
                    {catalog.canAdd && (
                      <Button type="button" variant="outline" size="sm" onClick={() => openAdd(searchQuery)}>
                        <Plus className="h-3 w-3 mr-1" />
                        "{searchQuery}" toevoegen
                      </Button>
                    )}
                  </div>
                )
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Begin te typen om te zoeken
                </div>
              )}
            </ListArea>
          </TabsContent>

          <TabsContent value="muscle" className="mt-0 flex-1 min-h-0 flex-col data-[state=active]:flex">
            {!selectedMuscle ? (
              <ListArea>
                <div className="p-2 grid grid-cols-2 gap-1">
                  {(Object.keys(muscleGroupLabels) as MuscleGroup[]).map((muscle) => (
                    <Button
                      key={muscle}
                      variant="ghost"
                      size="sm"
                      className="justify-start text-sm h-9"
                      onClick={() => setSelectedMuscle(muscle)}
                    >
                      {muscleGroupLabels[muscle]}
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {byMuscle(muscle).length}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </ListArea>
            ) : (
              <>
                <div className="p-2 border-b flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMuscle(null)}
                    className="h-7 px-2 text-xs"
                  >
                    ← Terug
                  </Button>
                  <Badge variant="outline">{muscleGroupLabels[selectedMuscle]}</Badge>
                </div>
                <ListArea>
                  <div className="p-1">
                    {filteredExercises.map((exercise) => (
                      <ExerciseItem
                        key={exercise.name}
                        exercise={exercise}
                        isSelected={value === exercise.name}
                        onSelect={handleSelect}
                        onRemove={customIds.has(exercise.name) ? setPendingRemove : undefined}
                      />
                    ))}
                  </div>
                </ListArea>
              </>
            )}
          </TabsContent>

          <TabsContent value="ppl" className="mt-0 flex-1 min-h-0 flex-col data-[state=active]:flex">
            {!selectedPPL ? (
              <div className="p-4 space-y-2 overflow-y-auto">
                {(Object.keys(pplLabels) as PPLCategory[]).map((ppl) => (
                  <Button
                    key={ppl}
                    variant="outline"
                    className={cn(
                      "w-full justify-between h-12",
                      ppl === "push" && "border-primary/30 hover:bg-primary/10",
                      ppl === "pull" && "border-accent/30 hover:bg-accent/10",
                      ppl === "legs" && "border-secondary/50 hover:bg-secondary/30"
                    )}
                    onClick={() => setSelectedPPL(ppl)}
                  >
                    <span className="font-medium">{pplLabels[ppl]}</span>
                    <Badge variant="secondary">
                      {byPpl(ppl).length} oefeningen
                    </Badge>
                  </Button>
                ))}
              </div>
            ) : (
              <>
                <div className="p-2 border-b flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPPL(null)}
                    className="h-7 px-2 text-xs"
                  >
                    ← Terug
                  </Button>
                  <Badge variant="outline">{pplLabels[selectedPPL]}</Badge>
                </div>
                <ListArea>
                  <div className="p-1">
                    {filteredExercises.map((exercise) => (
                      <ExerciseItem
                        key={exercise.name}
                        exercise={exercise}
                        isSelected={value === exercise.name}
                        onSelect={handleSelect}
                        onRemove={customIds.has(exercise.name) ? setPendingRemove : undefined}
                      />
                    ))}
                  </div>
                </ListArea>
              </>
            )}
          </TabsContent>
        </Tabs>
        {catalog.canAdd && (
          <div className="border-t p-2">
            <Button type="button" variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => openAdd(searchQuery)}>
              <Plus className="h-3 w-3 mr-1" />
              Eigen oefening toevoegen
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
    <AddExerciseDialog
      open={addOpen}
      onOpenChange={setAddOpen}
      initialName={addName}
      onAdded={(name) => {
        onChange(name);
        setSearchQuery("");
      }}
    />
    <AlertDialog open={!!pendingRemove} onOpenChange={(o) => !o && setPendingRemove(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Oefening uit je lijst halen?</AlertDialogTitle>
          <AlertDialogDescription>
            "{pendingRemove?.name}" verdwijnt uit je oefeninglijst. Je opgeslagen workouts blijven ongewijzigd.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuleren</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              const id = pendingRemove ? customIds.get(pendingRemove.name) : undefined;
              if (id) catalog.removeExercise(id);
              setPendingRemove(null);
            }}
          >
            Verwijderen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

function ExerciseItem({
  exercise,
  isSelected,
  onSelect,
  onRemove,
}: {
  exercise: Exercise;
  isSelected: boolean;
  onSelect: (name: string) => void;
  /** Alleen voor eigen oefeningen. */
  onRemove?: (exercise: Exercise) => void;
}) {
  return (
    <div className="flex items-center gap-1">
    <button
      type="button"
      onClick={() => onSelect(exercise.name)}
      className={cn(
        "flex-1 min-w-0 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors",
        isSelected
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted"
      )}
    >
      <Check
        className={cn(
          "h-4 w-4 shrink-0",
          isSelected ? "opacity-100" : "opacity-0"
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium">{exercise.name}</div>
        <div className="flex items-center gap-1 text-xs opacity-70">
          <span>{muscleGroupLabels[exercise.muscleGroup]}</span>
          {exercise.equipment && (
            <>
              <span>•</span>
              <span>{exercise.equipment}</span>
            </>
          )}
          {onRemove && (
            <>
              <span>•</span>
              <span>Eigen</span>
            </>
          )}
        </div>
      </div>
    </button>
    {onRemove && (
      <button
        type="button"
        aria-label={`${exercise.name} uit je lijst halen`}
        onClick={() => onRemove(exercise)}
        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    )}
    </div>
  );
}
