import { describe, it, expect } from "vitest";
import { normalizeWorkout, withDerivedTotals } from "@/utils/workoutNormalization";
import { formatDuration, formatPace, parseDuration, speedKmh } from "@/utils/cardio";
import { getBest1RMFromSets, calculateVolumeFromSets } from "@/utils/fitnessCalculations";
import { buildSessions } from "@/utils/statistics";
import { makeExercise, makeWorkout } from "./factories";

const base = { id: "w1", userId: "u", date: "2026-11-10T10:00:00.000Z", startedAt: "2026-11-10T10:00:00.000Z", timeZone: "Europe/Brussels", trainingType: "Pull" };

describe("normalisatie van tijd en cardio", () => {
  it("bewaart tijdsets met extra gewicht en duur, zonder 1RM of volume", () => {
    const { workout } = normalizeWorkout({
      ...base,
      exercises: [{ exercise: "Plank", kind: "time", sets: [{ weight: 0, durationSeconds: 60 }, { weight: 10, durationSeconds: 45.4 }] }],
    });
    const ex = workout!.exercises[0];
    expect(ex.kind).toBe("time");
    expect(ex.sets).toEqual([
      { setNumber: 1, weight: 0, reps: 0, durationSeconds: 60 },
      { setNumber: 2, weight: 10, reps: 0, durationSeconds: 45 },
    ]);
    expect(ex.volume).toBe(0);
    expect(ex.estimated1RM).toBe(0);
  });

  it("slaat een tijdset zonder duur over, met een melding", () => {
    const { workout, issues } = normalizeWorkout({
      ...base,
      exercises: [{ exercise: "Plank", kind: "time", sets: [{ weight: 0 }, { weight: 0, durationSeconds: 30 }] }],
    });
    expect(workout!.exercises[0].sets).toHaveLength(1);
    expect(issues.join(" ")).toMatch(/set 1 is ongeldig/);
  });

  it("bewaart cardio met soort, afstand en tijd; een onbekende soort wordt 'Andere'", () => {
    const { workout } = normalizeWorkout({
      ...base,
      exercises: [
        { exercise: "Lopen", kind: "cardio", cardio: { activity: "Lopen", distanceKm: 10, durationSeconds: 3000 } },
        { exercise: "Skiën", kind: "cardio", cardio: { activity: "Skiën", distanceKm: -3, durationSeconds: 600 } },
      ],
    });
    expect(workout!.exercises[0]).toMatchObject({ kind: "cardio", cardio: { activity: "Lopen", distanceKm: 10, durationSeconds: 3000 }, sets: [] });
    expect(workout!.exercises[1].cardio).toEqual({ activity: "Andere", distanceKm: 0, durationSeconds: 600 });
  });

  it("laat cardio zonder geldige duur vallen", () => {
    const { workout, issues } = normalizeWorkout({
      ...base,
      exercises: [{ exercise: "Lopen", kind: "cardio", cardio: { activity: "Lopen", distanceKm: 5 } }, { exercise: "Bench", sets: [{ weight: 60, reps: 5 }] }],
    });
    expect(workout!.exercises.map((e) => e.exercise)).toEqual(["Bench"]);
    expect(issues.join(" ")).toMatch(/cardiogegevens/);
  });

  it("bestaande krachtdata blijft identiek: geen kind en geen extra velden", () => {
    const raw = makeWorkout({ exercises: [makeExercise("Bench Press", [[80, 5]])] });
    const { workout } = normalizeWorkout(raw);
    expect(workout!.exercises[0]).not.toHaveProperty("kind");
    expect(workout!.exercises[0]).not.toHaveProperty("cardio");
    expect(workout!.totalVolume).toBe(400);
  });

  it("totaal volume telt alleen krachtsets; een workout met enkel cardio is geldig", () => {
    const { workout } = normalizeWorkout({
      ...base,
      trainingType: "Cardio",
      exercises: [{ exercise: "Lopen", kind: "cardio", cardio: { activity: "Lopen", distanceKm: 10, durationSeconds: 3000 } }],
    });
    expect(workout).not.toBeNull();
    expect(withDerivedTotals(workout!).totalVolume).toBe(0);
    expect(workout!.trainingType).toBe("Cardio");
  });
});

describe("berekeningen negeren tijdsets", () => {
  it("een tijdset (reps 0) geeft geen 1RM en geen volume", () => {
    const sets = [{ weight: 20, reps: 0, durationSeconds: 60 }];
    expect(getBest1RMFromSets(sets)).toBe(0);
    expect(calculateVolumeFromSets(sets)).toBe(0);
  });

  it("statistieken: een training met alleen cardio telt als sessie zonder volume", () => {
    const w = makeWorkout({
      id: "c",
      trainingType: "Cardio",
      exercises: [{ exercise: "Lopen", kind: "cardio", cardio: { activity: "Lopen", distanceKm: 10, durationSeconds: 3000 }, sets: [], volume: 0, estimated1RM: 0 }],
    });
    const { sessions } = buildSessions([w]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].volume).toBeNull();
  });
});

describe("duur en tempo", () => {
  it("leest en toont duur", () => {
    expect(parseDuration("90", "seconds")).toBe(90);
    expect(parseDuration("30", "minutes")).toBe(1800);
    expect(parseDuration("1:30", "seconds")).toBe(90);
    expect(parseDuration("1:02:03", "minutes")).toBe(3723);
    expect(parseDuration("0:75", "seconds")).toBeNull();
    expect(parseDuration("abc", "seconds")).toBeNull();
    expect(parseDuration("", "seconds")).toBeNull();
    expect(parseDuration("0", "seconds")).toBeNull();
    expect(formatDuration(90)).toBe("1:30");
    expect(formatDuration(3723)).toBe("1:02:03");
  });

  it("rekent tempo en snelheid uit afstand en tijd", () => {
    const c = { distanceKm: 10, durationSeconds: 3000 };
    expect(formatPace(c)).toBe("5:00/km");
    expect(speedKmh(c)).toBe(12);
    expect(formatPace({ distanceKm: 0, durationSeconds: 600 })).toBeNull();
  });
});

import { compareCardioWeeks, timedProgress } from "@/utils/statistics";

const run = (id: string, iso: string, km: number, sec: number) =>
  makeWorkout({
    id,
    startedAt: iso,
    timeZone: "Europe/Brussels",
    trainingType: "Cardio",
    exercises: [{ exercise: "Lopen", kind: "cardio", cardio: { activity: "Lopen", distanceKm: km, durationSeconds: sec }, sets: [], volume: 0, estimated1RM: 0 }],
  });
const plank = (id: string, iso: string, ...secs: number[]) =>
  makeWorkout({
    id,
    startedAt: iso,
    timeZone: "Europe/Brussels",
    exercises: [{ exercise: "Plank", kind: "time", sets: secs.map((d, i) => ({ setNumber: i + 1, weight: 0, reps: 0, durationSeconds: d })), volume: 0, estimated1RM: 0 }],
  });

describe("statistieken voor cardio en tijdoefeningen", () => {
  it("telt cardio per week en vergelijkt met vorige week", () => {
    const { sessions } = buildSessions([
      run("a", "2026-11-10T10:00:00.000Z", 10, 3000),
      run("b", "2026-11-12T10:00:00.000Z", 5, 1500),
      run("c", "2026-11-03T10:00:00.000Z", 8, 2400),
    ]);
    const r = compareCardioWeeks(sessions, "2026-11-15");
    expect(r.thisWeek).toEqual({ count: 2, km: 15, seconds: 4500 });
    expect(r.lastWeek).toEqual({ count: 1, km: 8, seconds: 2400 });
  });

  it("toont per tijdoefening de langste set nu en de vorige keer", () => {
    const { sessions } = buildSessions([plank("p1", "2026-11-03T10:00:00.000Z", 60, 45), plank("p2", "2026-11-10T10:00:00.000Z", 50, 75)]);
    const [t] = timedProgress(sessions);
    expect(t).toMatchObject({ exerciseName: "Plank", lastSeconds: 75, previousSeconds: 60, sessions: 2 });
  });

  it("één sessie heeft geen vorige", () => {
    const { sessions } = buildSessions([plank("p1", "2026-11-03T10:00:00.000Z", 60)]);
    expect(timedProgress(sessions)[0].previousSeconds).toBeNull();
  });
});
