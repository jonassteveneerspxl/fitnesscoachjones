import { Badge } from "@/components/ui/badge";
import { ExerciseComparison, ProgressStatus, WorkoutComparison } from "@/utils/statistics";
import { formatShortDate } from "@/utils/dates";
import { formatKg, formatNumber } from "@/utils/format";
import { DeltaText } from "@/components/stats/DeltaText";

const STATUS_LABEL: Record<ProgressStatus, string> = {
  first: "Eerste keer",
  up: "Vooruitgang",
  down: "Achteruitgang",
  same: "Gelijk",
  mixed: "Gemengd",
};

const STATUS_CLASS: Record<ProgressStatus, string> = {
  first: "text-muted-foreground",
  up: "text-emerald-400 border-emerald-500/40",
  down: "text-rose-400 border-rose-500/40",
  same: "text-muted-foreground",
  mixed: "text-amber-400 border-amber-500/40",
};

export function ComparisonList({
  rows,
  workout,
}: {
  rows: ExerciseComparison[];
  workout?: WorkoutComparison;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Deze training bevat geen setgegevens om te vergelijken.</p>;
  }
  return (
    <div className="space-y-3">
      {workout?.volume && (
        <p className="text-sm text-muted-foreground">
          Totaal volume {formatKg(workout.volume.current)}{" "}
          <DeltaText delta={workout.volume} unit=" kg" /> t.o.v. {formatKg(workout.volume.previous)} op{" "}
          {formatShortDate(workout.previousDateKey as string)}.
        </p>
      )}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.exerciseKey} className="p-3 rounded-lg bg-secondary/40 border border-border/50">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-medium text-foreground">{r.exerciseName}</span>
              <Badge variant="outline" className={`text-xs ${STATUS_CLASS[r.status]}`}>
                {STATUS_LABEL[r.status]}
              </Badge>
            </div>
            {r.previous ? (
              <>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Vergeleken met {formatShortDate(r.previousDateKey as string)}
                </p>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Zwaarste set</dt>
                    <dd className="text-foreground">
                      {formatKg(r.current.maxWeight)} <DeltaText delta={r.maxWeight} unit=" kg" />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Volume</dt>
                    <dd className="text-foreground">
                      {formatKg(r.current.exerciseVolume)} <DeltaText delta={r.exerciseVolume} unit=" kg" />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Herhalingen</dt>
                    <dd className="text-foreground">
                      {formatNumber(r.current.totalReps)} <DeltaText delta={r.totalReps} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Geschatte 1RM</dt>
                    <dd className="text-foreground">
                      {formatKg(r.current.best1RM)} <DeltaText delta={r.best1RM} unit=" kg" />
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nog geen eerdere sessie van deze oefening: dit is je uitgangspunt.
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
