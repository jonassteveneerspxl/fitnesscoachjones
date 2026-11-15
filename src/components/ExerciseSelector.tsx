import { useState, useMemo } from "react";
import { Check, ChevronDown, Search, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export function ExerciseSelector({
  value,
  onChange,
  placeholder = "Selecteer oefening",
}: ExerciseSelectorProps) {
  const [open, setOpen] = useState(false);
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="w-full grid grid-cols-3 rounded-none border-b">
            <TabsTrigger value="search" className="text-xs">
              <Search className="h-3 w-3 mr-1" />
              Zoeken
            </TabsTrigger>
            <TabsTrigger value="muscle" className="text-xs">Spiergroep</TabsTrigger>
            <TabsTrigger value="ppl" className="text-xs">Push/Pull/Legs</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-0">
            <div className="p-2 border-b">
              <Input
                placeholder="Zoek oefening..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <ScrollArea className="h-[250px]">
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
            </ScrollArea>
          </TabsContent>

          <TabsContent value="muscle" className="mt-0">
            {!selectedMuscle ? (
              <ScrollArea className="h-[280px]">
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
              </ScrollArea>
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
                <ScrollArea className="h-[240px]">
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
                </ScrollArea>
              </>
            )}
          </TabsContent>

          <TabsContent value="ppl" className="mt-0">
            {!selectedPPL ? (
              <div className="p-4 space-y-2">
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
                <ScrollArea className="h-[240px]">
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
                </ScrollArea>
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
      </PopoverContent>
    </Popover>
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
