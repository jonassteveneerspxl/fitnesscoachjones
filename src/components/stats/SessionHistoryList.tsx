import { useState } from "react";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Session, compareWithPrevious, compareWorkoutTotals } from "@/utils/statistics";
import { describeWorkoutMoment } from "@/utils/dates";
import { formatKg } from "@/utils/format";
import { ComparisonList } from "@/components/stats/ComparisonList";

const PAGE = 10;

interface SessionHistoryListProps {
  /** Gefilterde sessies, nieuwste eerst. */
  sessions: Session[];
  /** Alle sessies (oplopend), om de vorige sessie te vinden. */
  allSessions: Session[];
}

export function SessionHistoryList({ sessions, allSessions }: SessionHistoryListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE);

  return (
    <div className="space-y-2">
      {sessions.slice(0, visible).map((s) => {
        const open = expanded === s.workoutId;
        const moment = describeWorkoutMoment(s.startedAt, s.timeZone);
        return (
          <div key={s.workoutId} className="rounded-xl border border-border bg-secondary/20 overflow-hidden">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setExpanded(open ? null : s.workoutId)}
              className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-secondary/40 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                    <Calendar className="w-3 h-3 text-muted-foreground" aria-hidden />
                    {moment}
                  </span>
                  {s.trainingType !== "Onbekend" && (
                    <Badge variant="outline" className="text-xs">
                      {s.trainingType}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {s.exercises.length} oefening{s.exercises.length === 1 ? "" : "en"}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {s.volume === null ? "Geen sets" : formatKg(s.volume)}
                  </p>
                  <p className="text-xs text-muted-foreground">totaal volume</p>
                </div>
                {open ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" aria-hidden />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" aria-hidden />
                )}
              </div>
            </button>

            {open && (
              <div className="px-3 pb-3 space-y-3">
                <ComparisonList
                  rows={compareWithPrevious(allSessions, s)}
                  workout={compareWorkoutTotals(allSessions, s)}
                />
                <div className="space-y-1.5">
                  {s.exercises.map((e) => (
                    <div key={e.exerciseKey} className="text-xs">
                      <span className="text-muted-foreground">{e.exerciseName}: </span>
                      {e.hasSets ? (
                        e.sets.map((set, i) => (
                          <span key={i} className="inline-block mr-1.5 px-1.5 py-0.5 rounded bg-muted text-foreground">
                            {set.weight}kg × {set.reps}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground">geen geldige sets</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      {sessions.length > visible && (
        <Button type="button" variant="ghost" className="w-full" onClick={() => setVisible((v) => v + PAGE)}>
          Toon meer ({sessions.length - visible} resterend)
        </Button>
      )}
    </div>
  );
}
