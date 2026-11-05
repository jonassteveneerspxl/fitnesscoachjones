/**
 * Maandkalender van trainingsdagen. Alles rekent met kalenderdagen (`YYYY-MM-DD`) in de opgeslagen tijdzone van
 * elke workout, zodat een avondtraining niet op de verkeerde dag belandt.
 */
import { Session } from "@/utils/statistics";
import { addDaysToDateKey, toMonthKey } from "@/utils/dates";

export interface CalendarDay {
  dateKey: string;
  /** Dag van de maand (1–31). */
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  /** Sessies op deze dag, in volgorde van starttijd. */
  sessions: Session[];
}

/** 0 = maandag … 6 = zondag. */
function weekdayIndex(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

function lastDayOfMonth(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${monthKey}-${String(last).padStart(2, "0")}`;
}

/** Weken (maandag eerst) die de hele maand dekken, aangevuld met dagen van de buurmaanden. */
export function buildMonthGrid(monthKey: string, sessions: Session[], todayKey: string): CalendarDay[][] {
  const byDay = new Map<string, Session[]>();
  for (const s of sessions) {
    const list = byDay.get(s.dateKey);
    if (list) list.push(s);
    else byDay.set(s.dateKey, [s]);
  }
  for (const list of byDay.values()) list.sort((a, b) => a.instantMs - b.instantMs);

  const first = `${monthKey}-01`;
  const last = lastDayOfMonth(monthKey);
  const start = addDaysToDateKey(first, -weekdayIndex(first));
  const end = addDaysToDateKey(last, 6 - weekdayIndex(last));

  const weeks: CalendarDay[][] = [];
  let week: CalendarDay[] = [];
  for (let key = start; key <= end; key = addDaysToDateKey(key, 1)) {
    week.push({
      dateKey: key,
      day: Number(key.slice(8)),
      inMonth: toMonthKey(key) === monthKey,
      isToday: key === todayKey,
      isFuture: key > todayKey,
      sessions: byDay.get(key) ?? [],
    });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  return weeks;
}

export interface MonthSummary {
  /** Aantal sessies (twee trainingen op één dag tellen allebei). */
  sessionCount: number;
  /** Aantal verschillende dagen waarop je getraind hebt. */
  trainingDays: number;
  /** Dagen zonder training, alleen tot en met vandaag (toekomstige dagen tellen niet als gemist). */
  restDays: number;
}

export function summarizeMonth(monthKey: string, sessions: Session[], todayKey: string): MonthSummary {
  const inMonth = sessions.filter((s) => s.monthKey === monthKey);
  const days = new Set(inMonth.map((s) => s.dateKey));
  const last = lastDayOfMonth(monthKey);
  const lastCounted = todayKey < `${monthKey}-01` ? null : todayKey < last ? todayKey : last;
  const elapsed = lastCounted ? Number(lastCounted.slice(8)) : 0;
  const trainedElapsed = [...days].filter((d) => lastCounted !== null && d <= lastCounted).length;
  return { sessionCount: inMonth.length, trainingDays: days.size, restDays: Math.max(0, elapsed - trainedElapsed) };
}

/** Korte naam van een trainingstype voor in een smalle dagcel. */
export function shortTypeLabel(type: string): string {
  if (type === "Full Body") return "Full";
  if (type === "Onbekend") return "";
  if (type === "Custom") return "Eigen";
  return type;
}
