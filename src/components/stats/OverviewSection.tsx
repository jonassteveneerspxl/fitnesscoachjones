import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import type { ExerciseTrend, WeekComparisonResult } from "@/utils/statistics";
import { formatKg } from "@/utils/format";

interface Props {
  weeks: WeekComparisonResult;
  trends: ExerciseTrend[];
  onSelectExercise: (exerciseKey: string) => void;
}

function Diff({ now, before, unit = "" }: { now: number; before: number; unit?: string }) {
  const d = Math.round((now - before) * 10) / 10;
  if (d === 0) return <span className="text-xs text-muted-foreground">gelijk aan vorige week</span>;
  return (
    <span className={`text-xs ${d > 0 ? "text-primary" : "text-muted-foreground"}`}>
      {d > 0 ? "+" : "−"}
      {Math.abs(d).toLocaleString("nl-BE")}
      {unit} t.o.v. vorige week
    </span>
  );
}

const trendText = (t: ExerciseTrend) =>
  t.direction === "same" ? "gelijk" : `${t.percent > 0 ? "+" : "−"}${Math.abs(t.percent).toLocaleString("nl-BE")}%`;

export function OverviewSection({ weeks, trends, onSelectExercise }: Props) {
  const { thisWeek, lastWeek } = weeks;
  return (
    <section className="space-y-3" aria-label="Overzicht">
      <div>
        <h2 className="text-base font-semibold text-foreground">Deze week</h2>
        <p className="text-xs text-muted-foreground">Opwarmsets tellen niet mee.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Trainingen", now: thisWeek.sessions, before: lastWeek.sessions, text: String(thisWeek.sessions), unit: "" },
          { label: "Sets", now: thisWeek.sets, before: lastWeek.sets, text: String(thisWeek.sets), unit: "" },
          { label: "Volume", now: thisWeek.volume, before: lastWeek.volume, text: formatKg(thisWeek.volume), unit: " kg" },
        ].map((k) => (
          <div key={k.label} className="p-3 rounded-xl gradient-card border border-border">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
            <p className="text-xl font-bold text-foreground mt-1">{k.text}</p>
            <Diff now={k.now} before={k.before} unit={k.unit} />
          </div>
        ))}
      </div>

      <div className="p-4 rounded-2xl gradient-card border border-border space-y-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Ga ik vooruit? Laatste 4 weken</h3>
          <p className="text-xs text-muted-foreground">
            Verandering van je geschatte 1RM (een schatting van je maximale gewicht voor 1 herhaling), eerste tegenover
            laatste training. Alleen oefeningen die je minstens 2 keer deed.
          </p>
        </div>
        {trends.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Nog te weinig data. Na twee trainingen met dezelfde oefening zie je hier je trend.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {trends.slice(0, 8).map((t) => {
              const Icon = t.direction === "up" ? ArrowUpRight : t.direction === "down" ? ArrowDownRight : ArrowRight;
              return (
                <li key={t.exerciseKey}>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 py-2 text-left hover:bg-secondary/40 rounded-lg px-1"
                    onClick={() => onSelectExercise(t.exerciseKey)}
                    aria-label={`${t.exerciseName}: ${trendText(t)}. Toon progressie`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${t.direction === "up" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="flex-1 min-w-0 truncate text-sm text-foreground">{t.exerciseName}</span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(t.firstE1RM)} → {Math.round(t.lastE1RM)} kg
                    </span>
                    <span className="text-sm font-semibold text-foreground w-14 text-right">{trendText(t)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
