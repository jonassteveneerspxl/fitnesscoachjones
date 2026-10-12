import { Trophy } from "lucide-react";
import { PRType } from "@/types/workout";
import { PR_LABELS, PR_TYPES } from "@/utils/fitnessCalculations";
import { ExerciseRecords, RecordEntry } from "@/utils/statistics";
import { formatShortDate } from "@/utils/dates";
import { formatKg, formatNumber } from "@/utils/format";

function describe(type: PRType, r: RecordEntry): string {
  switch (type) {
    case "maxWeight":
      return `${formatKg(r.value)} × ${r.reps}`;
    case "bestSetVolume":
      return `${formatKg(r.value)} (${formatNumber(r.weight ?? 0)} × ${r.reps})`;
    case "bestExerciseVolume":
      return `${formatKg(r.value)} in ${r.setCount} set${r.setCount === 1 ? "" : "s"}`;
    case "best1RM":
      return formatKg(r.value);
  }
}

export function RecordsTable({ records }: { records: ExerciseRecords[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Oefening</th>
            {PR_TYPES.map((t) => (
              <th key={t} className="py-2 pr-3 font-medium whitespace-nowrap">
                {PR_LABELS[t]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((rec) => (
            <tr key={rec.exerciseKey} className="border-b border-border/40 align-top">
              <th scope="row" className="py-2 pr-3 font-medium text-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Trophy className="w-3 h-3 text-primary shrink-0" aria-hidden />
                  {rec.exerciseName}
                </span>
              </th>
              {PR_TYPES.map((t) => {
                const r = rec.records[t];
                return (
                  <td key={t} className="py-2 pr-3">
                    {r ? (
                      <>
                        <div className="text-foreground whitespace-nowrap">{describe(t, r)}</div>
                        <div className="text-xs text-muted-foreground">{formatShortDate(r.dateKey)}</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground" title="Geen gegevens">
                        –
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
