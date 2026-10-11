/**
 * Datum- en tijdzonehulp. Workouts worden opgeslagen als UTC-instant (ISO 8601) samen met de
 * IANA-tijdzone van het toestel. Groeperen en tonen gebeurt in die opgeslagen tijdzone, zodat een
 * training van 23:30 op dezelfde kalenderdag blijft, ook als je later in een andere zone kijkt.
 */

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getDayFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

export function getDeviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.trim() === "") return false;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Parseert een ISO-string naar een geldig instant, of `null`. */
export function parseInstant(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Kalenderdag (`YYYY-MM-DD`) van een instant in de gegeven tijdzone. */
export function toDateKey(instant: Date, timeZone: string): string {
  const parts = getDayFormatter(timeZone).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function parseDateKey(dateKey: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateKey.split("-").map(Number);
  return { y, m, d };
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** ISO-8601-weeksleutel (`YYYY-Www`, maandag = eerste dag) van een kalenderdag. */
export function toIsoWeekKey(dateKey: string): string {
  const { y, m, d } = parseDateKey(dateKey);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayIndex = (date.getUTCDay() + 6) % 7; // maandag = 0
  date.setUTCDate(date.getUTCDate() - dayIndex + 3); // donderdag van deze week
  const isoYear = date.getUTCFullYear();
  const week1 = new Date(Date.UTC(isoYear, 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getUTCDay() + 6) % 7)) / 7
    );
  return `${isoYear}-W${pad2(week)}`;
}

/** Maandsleutel (`YYYY-MM`) van een kalenderdag. */
export function toMonthKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

/** Kalenderdag (`YYYY-MM-DD`) van de maandag van een ISO-week. */
export function isoWeekStartDateKey(weekKey: string): string {
  const [yearStr, weekStr] = weekKey.split("-W");
  const isoYear = Number(yearStr);
  const week = Number(weekStr);
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const mondayOfWeek1 = new Date(jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * 86400000);
  const monday = new Date(mondayOfWeek1.getTime() + (week - 1) * 7 * 86400000);
  return `${monday.getUTCFullYear()}-${pad2(monday.getUTCMonth() + 1)}-${pad2(monday.getUTCDate())}`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const { y, m, d } = parseDateKey(dateKey);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function addMonthsToMonthKey(monthKey: string, months: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
}

/** Alle weeksleutels van `from` t/m `to` (inclusief), oplopend. */
export function enumerateWeekKeys(from: string, to: string): string[] {
  const result: string[] = [];
  let cursor = isoWeekStartDateKey(from);
  const end = isoWeekStartDateKey(to);
  let guard = 0;
  while (cursor <= end && guard++ < 2000) {
    result.push(toIsoWeekKey(cursor));
    cursor = addDaysToDateKey(cursor, 7);
  }
  return result;
}

/** Alle maandsleutels van `from` t/m `to` (inclusief), oplopend. */
export function enumerateMonthKeys(from: string, to: string): string[] {
  const result: string[] = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard++ < 1000) {
    result.push(cursor);
    cursor = addMonthsToMonthKey(cursor, 1);
  }
  return result;
}

const DAY_LABEL = (timeZone: string) =>
  new Intl.DateTimeFormat("nl-BE", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  });

const TIME_LABEL = (timeZone: string) =>
  new Intl.DateTimeFormat("nl-BE", { timeZone, hour: "2-digit", minute: "2-digit" });

/** "dinsdag 10 maart" in de opgegeven tijdzone. */
export function formatDayLabel(instant: Date, timeZone: string): string {
  return DAY_LABEL(timeZone).format(instant);
}

/** "09:30" in de opgegeven tijdzone. */
export function formatTimeLabel(instant: Date, timeZone: string): string {
  return TIME_LABEL(timeZone).format(instant);
}

/** Korte datum voor assen en lijsten: "10 mrt 2026". */
export function formatShortDate(dateKey: string): string {
  const { y, m, d } = parseDateKey(dateKey);
  return new Intl.DateTimeFormat("nl-BE", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "wk 11 · 2026" voor een weeksleutel. */
export function formatWeekLabel(weekKey: string): string {
  const [year, week] = weekKey.split("-W");
  return `wk ${Number(week)} · ${year}`;
}

/** "maart 2026" voor een maandsleutel. */
export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("nl-BE", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}
