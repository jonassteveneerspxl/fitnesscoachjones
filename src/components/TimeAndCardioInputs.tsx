import { Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CARDIO_ACTIVITIES, CardioActivity } from "@/types/workout";
import { formatPace, parseDuration, speedKmh } from "@/utils/cardio";
import { CardioForm, TimeSetForm, isCardioValid } from "@/utils/exerciseForm";

interface TimeSetsProps {
  sets: TimeSetForm[];
  onChange: (sets: TimeSetForm[]) => void;
}

/** Sets van een tijdoefening: extra gewicht (optioneel) en duur. Afvinken werkt zoals bij krachtsets. */
export function TimeSetsEditor({ sets, onChange }: TimeSetsProps) {
  const update = (i: number, patch: Partial<TimeSetForm>) => onChange(sets.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <div className="space-y-2">
      <Label className="text-sm text-muted-foreground">Sets (tijd vasthouden)</Label>
      {sets.map((set, i) => {
        const done = set.done !== false;
        return (
          <div key={i} className="flex items-center gap-2">
            <button
              type="button"
              role="checkbox"
              aria-checked={done}
              aria-label={`Set ${i + 1} afvinken`}
              onClick={() => update(i, { done: !done })}
              className={`h-9 w-9 shrink-0 rounded-full border text-sm flex items-center justify-center ${
                done ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
              }`}
            >
              {done ? <Check className="w-4 h-4" /> : i + 1}
            </button>
            <Input
              inputMode="text"
              placeholder="Tijd (1:00 of sec)"
              aria-label={`Tijd set ${i + 1}`}
              value={set.duration ?? ""}
              onChange={(e) => update(i, { duration: e.target.value, done: true })}
            />
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="+ kg"
              aria-label={`Extra gewicht set ${i + 1}`}
              className="w-24"
              value={set.weight}
              onChange={(e) => update(i, { weight: e.target.value, done: true })}
            />
            {sets.length > 1 && (
              <button
                type="button"
                aria-label={`Set ${i + 1} verwijderen`}
                className="p-1 text-muted-foreground hover:text-destructive"
                onClick={() => onChange(sets.filter((_, j) => j !== i))}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...sets, { weight: sets[sets.length - 1]?.weight ?? "", duration: sets[sets.length - 1]?.duration ?? "" }])}
      >
        <Plus className="w-4 h-4 mr-1" /> Set toevoegen
      </Button>
    </div>
  );
}

/** Eén cardio-onderdeel: soort, afstand en tijd. Tempo en snelheid verschijnen vanzelf. */
export function CardioEditor({ value, onChange }: { value: CardioForm; onChange: (c: CardioForm) => void }) {
  const secs = parseDuration(value.duration, "minutes");
  const km = Number(value.distance.trim().replace(",", "."));
  const live = secs !== null && km > 0 ? { distanceKm: km, durationSeconds: secs } : null;
  const invalid = (value.distance.trim() !== "" || value.duration.trim() !== "") && !isCardioValid(value);
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="cardio-soort" className="text-sm text-muted-foreground">Soort</Label>
        <select
          id="cardio-soort"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={value.activity}
          onChange={(e) => onChange({ ...value, activity: e.target.value as CardioActivity })}
        >
          {CARDIO_ACTIVITIES.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="cardio-afstand" className="text-sm text-muted-foreground">Afstand (km)</Label>
          <Input
            id="cardio-afstand"
            inputMode="decimal"
            placeholder="bv. 10"
            value={value.distance}
            onChange={(e) => onChange({ ...value, distance: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cardio-tijd" className="text-sm text-muted-foreground">Tijd</Label>
          <Input
            id="cardio-tijd"
            inputMode="text"
            placeholder="50:00 of minuten"
            value={value.duration}
            onChange={(e) => onChange({ ...value, duration: e.target.value })}
          />
        </div>
      </div>
      {live && (
        <p className="text-xs text-muted-foreground" data-testid="cardio-pace">
          {formatPace(live)} · {speedKmh(live)?.toLocaleString("nl-BE")} km/u
        </p>
      )}
      {invalid && (
        <p className="text-xs text-destructive">Vul een tijd in (bv. 50:00 of 50) en een afstand groter dan 0, of laat de afstand leeg.</p>
      )}
    </div>
  );
}
