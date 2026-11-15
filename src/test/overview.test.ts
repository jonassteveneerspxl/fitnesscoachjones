import { describe, it, expect } from "vitest";
import { buildSessions, compareWeeks, exerciseTrends } from "@/utils/statistics";
import { makeExercise, makeWorkout } from "./factories";

const BRU = "Europe/Brussels";
let n = 0;
const w = (iso: string, ex: ReturnType<typeof makeExercise>[]) =>
  makeWorkout({ id: `w${++n}`, startedAt: iso, timeZone: BRU, exercises: ex });
const bench = (...p: [number, number][]) => makeExercise("Bench Press", p);

// 2026-11-15 is een zondag; ISO-week 46 loopt van 9 t/m 15 november.
const TODAY = "2026-11-15";

describe("compareWeeks", () => {
  it("telt deze week en vorige week apart", () => {
    const { sessions } = buildSessions([
      w("2026-11-10T10:00:00.000Z", [bench([100, 5], [100, 5])]),
      w("2026-11-12T10:00:00.000Z", [bench([100, 5])]),
      w("2026-11-03T10:00:00.000Z", [bench([90, 5])]),
    ]);
    const r = compareWeeks(sessions, TODAY);
    expect(r.thisWeek).toEqual({ sessions: 2, volume: 1500, sets: 3 });
    expect(r.lastWeek).toEqual({ sessions: 1, volume: 450, sets: 1 });
  });

  it("opwarmsets tellen niet mee in sets en volume", () => {
    const ex = makeExercise("Bench Press", [[100, 5]]);
    ex.sets = [{ setNumber: 1, weight: 40, reps: 10, isWarmup: true }, ...ex.sets];
    const { sessions } = buildSessions([w("2026-11-10T10:00:00.000Z", [ex])]);
    const r = compareWeeks(sessions, TODAY);
    expect(r.thisWeek.sets).toBe(1);
    expect(r.thisWeek.volume).toBe(500);
  });
});

describe("exerciseTrends", () => {
  it("geeft een stijging in procent tussen eerste en laatste sessie in 4 weken", () => {
    const { sessions } = buildSessions([
      w("2026-10-20T10:00:00.000Z", [bench([100, 5])]),
      w("2026-11-10T10:00:00.000Z", [bench([105, 5])]),
    ]);
    const [t] = exerciseTrends(sessions, TODAY);
    expect(t.direction).toBe("up");
    expect(t.percent).toBeCloseTo(5, 0);
    expect(t.sessions).toBe(2);
  });

  it("zegt niets bij één sessie en negeert sessies buiten de periode", () => {
    const { sessions } = buildSessions([
      w("2026-08-01T10:00:00.000Z", [bench([80, 5])]),
      w("2026-11-10T10:00:00.000Z", [bench([105, 5])]),
    ]);
    expect(exerciseTrends(sessions, TODAY)).toEqual([]);
  });

  it("binnen 1% is gelijk, en een daling is een daling", () => {
    const { sessions } = buildSessions([
      w("2026-10-20T10:00:00.000Z", [bench([100, 5]), ]),
      w("2026-11-10T10:00:00.000Z", [bench([100, 5])]),
      w("2026-10-21T10:00:00.000Z", [makeExercise("Squat", [[120, 5]])]),
      w("2026-11-11T10:00:00.000Z", [makeExercise("Squat", [[110, 5]])]),
    ]);
    const byName = Object.fromEntries(exerciseTrends(sessions, TODAY).map((t) => [t.exerciseName, t.direction]));
    expect(byName["Bench Press"]).toBe("same");
    expect(byName["Squat"]).toBe("down");
  });
});
