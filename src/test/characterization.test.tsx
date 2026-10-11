/**
 * Karakteriseringstests: leggen het gedrag vast van de applicatie VOOR de uitbreiding.
 * Tests die bewust veranderd worden, staan onderaan gemarkeerd met "LEGACY".
 */
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  calculate1RM,
  calculateVolumeFromSets,
  getBest1RMFromSets,
  checkForPR,
  generateCoachResponse,
} from "@/utils/fitnessCalculations";
import { useWorkoutLogs } from "@/hooks/useWorkoutLogs";
import type { Workout } from "@/types/workout";

const KEY = "fitness-coach-workouts";

const makeWorkout = (over: Partial<Workout> = {}): Workout => ({
  id: "w1",
  userId: "user-1",
  date: "2026-03-10T12:00:00.000Z",
  exercises: [
    {
      exercise: "Bench Press",
      sets: [
        { weight: 80, reps: 5 },
        { weight: 80, reps: 4 },
      ],
      volume: 720,
      estimated1RM: 93,
    },
  ],
  totalVolume: 720,
  ...over,
});

describe("berekeningen (huidig gedrag)", () => {
  it("calculate1RM gebruikt Epley en rondt af", () => {
    expect(calculate1RM(100, 1)).toBe(100);
    expect(calculate1RM(100, 10)).toBe(133);
    expect(calculate1RM(80, 5)).toBe(93);
  });

  it("volume = som van gewicht × reps", () => {
    expect(
      calculateVolumeFromSets([
        { weight: 80, reps: 5 },
        { weight: 82.5, reps: 4 },
      ])
    ).toBe(730);
    expect(calculateVolumeFromSets([])).toBe(0);
  });

  it("getBest1RMFromSets neemt de hoogste geschatte 1RM, 0 bij geen sets", () => {
    expect(
      getBest1RMFromSets([
        { weight: 100, reps: 1 },
        { weight: 80, reps: 10 },
      ])
    ).toBe(107);
    expect(getBest1RMFromSets([])).toBe(0);
  });

  it("generateCoachResponse telt totaalvolume op", () => {
    const res = generateCoachResponse(makeWorkout().exercises, []);
    expect(res.totalVolume).toBe(720);
    expect(res.exercises).toHaveLength(1);
  });
});

describe("opslag via useWorkoutLogs (huidig gedrag)", () => {
  beforeEach(() => localStorage.clear());

  it("start leeg zonder opgeslagen data", () => {
    const { result } = renderHook(() => useWorkoutLogs());
    expect(result.current.workouts).toEqual([]);
  });

  it("laadt opgeslagen workouts na 'herladen'", () => {
    localStorage.setItem(KEY, JSON.stringify([makeWorkout()]));
    const { result } = renderHook(() => useWorkoutLogs());
    expect(result.current.workouts).toHaveLength(1);
    expect(result.current.workouts[0].id).toBe("w1");
  });

  it("addWorkout zet nieuwste vooraan en schrijft naar localStorage", () => {
    const { result } = renderHook(() => useWorkoutLogs());
    act(() => result.current.addWorkout(makeWorkout({ id: "a" })));
    act(() => result.current.addWorkout(makeWorkout({ id: "b" })));
    expect(result.current.workouts.map((w) => w.id)).toEqual(["b", "a"]);
    expect(JSON.parse(localStorage.getItem(KEY)!).map((w: Workout) => w.id)).toEqual(["b", "a"]);
  });

  it("getRecentWorkouts beperkt het aantal", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify([1, 2, 3].map((n) => makeWorkout({ id: `w${n}` })))
    );
    const { result } = renderHook(() => useWorkoutLogs());
    expect(result.current.getRecentWorkouts(2)).toHaveLength(2);
  });

  it("migreert het oude WorkoutLog-formaat en groepeert logs op dag (middag-timestamps, tijdzone-neutraal)", () => {
    const legacy = [
      { id: "l1", userId: "u", exercise: "Squat", sets: [{ weight: 100, reps: 5 }], date: "2026-03-10T11:00:00.000Z", volume: 500, estimated1RM: 117 },
      { id: "l2", userId: "u", exercise: "Row", sets: [{ weight: 60, reps: 8 }], date: "2026-03-10T12:00:00.000Z", volume: 480, estimated1RM: 76 },
      { id: "l3", userId: "u", exercise: "Curl", sets: [{ weight: 20, reps: 10 }], date: "2026-03-12T12:00:00.000Z", volume: 200, estimated1RM: 27 },
    ];
    localStorage.setItem(KEY, JSON.stringify(legacy));
    const { result } = renderHook(() => useWorkoutLogs());
    expect(result.current.workouts).toHaveLength(2);
    const sameDay = result.current.workouts.find((w) => w.exercises.length === 2)!;
    expect(sameDay.totalVolume).toBe(980);
    expect(sameDay.id).toBe("l1");
  });

  // LEGACY: onderstaande tests documenteren gedrag dat bewust wordt verbeterd.
  it("LEGACY: corrupte JSON geeft lege state en de volgende addWorkout overschrijft de ruwe data", () => {
    localStorage.setItem(KEY, "{not json");
    const { result } = renderHook(() => useWorkoutLogs());
    expect(result.current.workouts).toEqual([]);
    act(() => result.current.addWorkout(makeWorkout({ id: "nieuw" })));
    expect(localStorage.getItem(KEY)).not.toContain("not json");
  });
});

describe("PR-logica (huidig gedrag)", () => {
  it("LEGACY: de eerste registratie van een oefening telt altijd als PR", () => {
    expect(checkForPR("Squat", [{ weight: 50, reps: 5 }], [])).toBe(true);
  });

  it("vergelijkt hoofdletterongevoelig op geschatte 1RM", () => {
    const prev = [makeWorkout()];
    expect(checkForPR("bench press", [{ weight: 60, reps: 5 }], prev)).toBe(false);
    expect(checkForPR("BENCH PRESS", [{ weight: 100, reps: 5 }], prev)).toBe(true);
  });
});
