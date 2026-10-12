import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRAINING_TYPES, TrainingType } from "@/types/workout";
import { ExerciseOption, PERIOD_PRESET_LABELS, PeriodPreset } from "@/utils/statistics";
import { DEFAULT_FILTERS, FilterState } from "@/components/stats/filterState";
import { cn } from "@/lib/utils";

const ALL = "__all__";

interface StatsFiltersProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
  exerciseOptions: ExerciseOption[];
  /** Types die in de gegevens voorkomen; alleen die worden aangeboden. */
  availableTypes: TrainingType[];
}

export function StatsFilters({ value, onChange, exerciseOptions, availableTypes }: StatsFiltersProps) {
  const set = (patch: Partial<FilterState>) => onChange({ ...value, ...patch });
  const toggleType = (t: TrainingType) =>
    set({ types: value.types.includes(t) ? value.types.filter((x) => x !== t) : [...value.types, t] });
  const isDefault =
    value.preset === "all" && value.types.length === 0 && value.exerciseKey === null;
  const invalidRange = value.preset === "custom" && value.customFrom && value.customTo && value.customFrom > value.customTo;
  const types = TRAINING_TYPES.filter((t) => availableTypes.includes(t));

  return (
    <section className="p-5 rounded-2xl gradient-card border border-border space-y-4" aria-label="Filters">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Filters</h2>
        <Button type="button" variant="ghost" size="sm" disabled={isDefault} onClick={() => onChange(DEFAULT_FILTERS)}>
          <RotateCcw className="w-3 h-3 mr-1" />
          Herstel
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Periode</Label>
          <Select value={value.preset} onValueChange={(v) => set({ preset: v as PeriodPreset })}>
            <SelectTrigger className="bg-background border-border" aria-label="Periode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIOD_PRESET_LABELS) as PeriodPreset[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {PERIOD_PRESET_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Oefening</Label>
          <Select
            value={value.exerciseKey ?? ALL}
            onValueChange={(v) => set({ exerciseKey: v === ALL ? null : v })}
          >
            <SelectTrigger className="bg-background border-border" aria-label="Oefening">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={ALL}>Alle oefeningen</SelectItem>
              {exerciseOptions.map((o) => (
                <SelectItem key={o.key} value={o.key}>
                  {o.name} ({o.sessions})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {value.preset === "custom" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="stats-from" className="text-xs text-muted-foreground">
              Van
            </Label>
            <Input
              id="stats-from"
              type="date"
              value={value.customFrom}
              max={value.customTo || undefined}
              onChange={(e) => set({ customFrom: e.target.value })}
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stats-to" className="text-xs text-muted-foreground">
              Tot en met
            </Label>
            <Input
              id="stats-to"
              type="date"
              value={value.customTo}
              min={value.customFrom || undefined}
              onChange={(e) => set({ customTo: e.target.value })}
              className="bg-background border-border"
            />
          </div>
          {invalidRange && (
            <p className="text-xs text-destructive sm:col-span-2" role="alert">
              De einddatum ligt voor de begindatum: er worden geen workouts getoond.
            </p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Trainingstype</Label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Trainingstype">
          {types.map((t) => {
            const active = value.types.includes(t);
            return (
              <button
                key={t}
                type="button"
                aria-pressed={active}
                onClick={() => toggleType(t)}
                className={cn(
                  "px-3 py-1 rounded-full border text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/40 text-muted-foreground border-border hover:text-foreground hover:border-primary/50"
                )}
              >
                {t}
              </button>
            );
          })}
          {types.length === 0 && <span className="text-xs text-muted-foreground">Nog geen workouts.</span>}
        </div>
        <p className="text-xs text-muted-foreground">Geen type gekozen = alle types.</p>
      </div>
    </section>
  );
}
