import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SessionHistoryList } from "@/components/stats/SessionHistoryList";
import { useWorkoutLogs } from "@/hooks/useWorkoutLogs";
import { buildMonthGrid, shortTypeLabel, summarizeMonth } from "@/utils/calendar";
import { addMonthsToMonthKey, formatDayLabel, formatMonthLabel, getDeviceTimeZone, toDateKey, toMonthKey } from "@/utils/dates";
import { buildSessions } from "@/utils/statistics";

const WEEKDAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];

interface CalendarPageProps {
  /** Alleen voor tests: vaste "vandaag" (`YYYY-MM-DD`). */
  today?: string;
}

const CalendarPage = ({ today }: CalendarPageProps) => {
  const { workouts, isLoading, storageInfo } = useWorkoutLogs();
  const todayKey = today ?? toDateKey(new Date(), getDeviceTimeZone());
  const currentMonth = toMonthKey(todayKey);
  const [month, setMonth] = useState(currentMonth);
  const [selected, setSelected] = useState<string | null>(null);

  const built = useMemo(() => buildSessions(workouts), [workouts]);
  const weeks = useMemo(() => buildMonthGrid(month, built.sessions, todayKey), [month, built.sessions, todayKey]);
  const summary = useMemo(() => summarizeMonth(month, built.sessions, todayKey), [month, built.sessions, todayKey]);
  const selectedDay = selected ? weeks.flat().find((d) => d.dateKey === selected) : undefined;
  const monthLabel = formatMonthLabel(month);

  const goTo = (key: string) => {
    setMonth(key);
    setSelected(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader containerClassName="max-w-3xl" />
      <main className="container max-w-3xl pt-6 pb-24 space-y-6">
        {storageInfo.warnings.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>Let op bij het laden van je gegevens</AlertTitle>
            <AlertDescription className="text-xs">{storageInfo.warnings.slice(0, 3).join(" ")}</AlertDescription>
          </Alert>
        )}

        <section className="p-4 rounded-2xl gradient-card border border-border space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="icon" aria-label="Vorige maand" onClick={() => goTo(addMonthsToMonthKey(month, -1))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold text-foreground capitalize" aria-live="polite">
              {monthLabel}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Volgende maand"
              disabled={month >= currentMonth}
              onClick={() => goTo(addMonthsToMonthKey(month, 1))}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Gegevens laden…</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 text-center" data-testid="month-summary">
                <div className="rounded-xl bg-secondary/30 p-2">
                  <p className="text-xl font-bold text-foreground">{summary.trainingDays}</p>
                  <p className="text-xs text-muted-foreground">trainingsdagen</p>
                </div>
                <div className="rounded-xl bg-secondary/30 p-2">
                  <p className="text-xl font-bold text-foreground">{summary.sessionCount}</p>
                  <p className="text-xs text-muted-foreground">trainingen</p>
                </div>
                <div className="rounded-xl bg-secondary/30 p-2">
                  <p className="text-xl font-bold text-foreground">{summary.restDays}</p>
                  <p className="text-xs text-muted-foreground">rustdagen</p>
                </div>
              </div>

              <div role="grid" aria-label={`Kalender ${monthLabel}`} className="space-y-1">
                <div role="row" className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                  {WEEKDAYS.map((d) => (
                    <div key={d} role="columnheader">
                      {d}
                    </div>
                  ))}
                </div>
                {weeks.map((week) => (
                  <div key={week[0].dateKey} role="row" className="grid grid-cols-7 gap-1">
                    {week.map((day) => {
                      const trained = day.sessions.length > 0;
                      const isSelected = selected === day.dateKey;
                      const types = day.sessions.map((s) => shortTypeLabel(s.trainingType)).filter(Boolean);
                      return (
                        <button
                          key={day.dateKey}
                          type="button"
                          role="gridcell"
                          data-testid={`day-${day.dateKey}`}
                          data-trained={trained}
                          aria-selected={isSelected}
                          aria-label={`${formatDayLabel(new Date(`${day.dateKey}T12:00:00Z`), "UTC")}${
                            trained ? `, getraind: ${day.sessions.map((s) => s.trainingType).join(", ")}` : day.isFuture ? "" : ", niet getraind"
                          }`}
                          disabled={!day.inMonth || day.isFuture}
                          onClick={() => setSelected(isSelected ? null : day.dateKey)}
                          className={[
                            "aspect-square min-h-11 rounded-lg flex flex-col items-center justify-center gap-0.5 text-xs transition-colors border",
                            !day.inMonth ? "invisible" : "",
                            trained ? "bg-primary/20 border-primary/40 text-foreground" : "bg-secondary/20 border-transparent text-muted-foreground",
                            day.isFuture ? "opacity-40" : "",
                            day.isToday ? "ring-2 ring-primary" : "",
                            isSelected ? "outline outline-2 outline-foreground" : "",
                          ].join(" ")}
                        >
                          <span className="font-medium">{day.day}</span>
                          {trained && (
                            <>
                              <Check className="w-3.5 h-3.5 text-primary" aria-hidden />
                              <span className="text-[9px] leading-none truncate max-w-full">
                                {day.sessions.length > 1 ? `${day.sessions.length}×` : types[0]}
                              </span>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {month !== currentMonth && (
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => goTo(currentMonth)}>
                  Naar deze maand
                </Button>
              )}
              {built.undated.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {built.undated.length} workout{built.undated.length === 1 ? "" : "s"} zonder geldige datum staan niet in de kalender.
                </p>
              )}
            </>
          )}
        </section>

        {selectedDay && (
          <section className="p-4 rounded-2xl gradient-card border border-border space-y-3" aria-live="polite">
            <h3 className="font-semibold text-foreground">
              {formatDayLabel(new Date(`${selectedDay.dateKey}T12:00:00Z`), "UTC")}
            </h3>
            {selectedDay.sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Rustdag: geen training gelogd.</p>
            ) : (
              <SessionHistoryList sessions={selectedDay.sessions} allSessions={built.sessions} />
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default CalendarPage;
