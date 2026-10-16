/**
 * Karakteriseringstests: leggen het gedrag vast dat bestaande gebruikers van de oorspronkelijke app kennen.
 *
 * Bewuste gedragswijzigingen ten opzichte van de oorspronkelijke versie (zie ook het auditrapport):
 *  1. Opslag gebeurt asynchroon via een repository, onder een nieuwe sleutel (v2). De oorspronkelijke sleutel
 *     blijft onaangeroerd en wordt bij het eerste laden gemigreerd.
 *  2. Corrupte data wordt in quarantaine gezet in plaats van overschreven bij de volgende opslag.
 *  3. De eerste registratie van een oefening telt niet meer als persoonlijk record.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  calculate1RM,
  calculateVolumeFromSets,
  getBest1RMFromSets,
  checkForPR,
  generateCoachResponse,
} from "@/utils/fitnessCalculations";
import { useWorkoutLogs } from "@/hooks/useWorkoutLogs";
import { LEGACY_STORAGE_KEY, STORAGE_KEY_V2 } from "@/utils/workoutStorage";
import { makeExercise, makeWorkout } from "./factories";

// Het oorspronkelijke opslagformaat: een kale array van workouts zonder type/tijdzone/setnummers.
const legacyWorkout = (id: string, date = "2026-03-10T12:00:00.000Z") => ({
  id,
  userId: "user-1",
  date,
  totalVolume: 720,
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
});

describe("berekeningen (ongewijzigd gedrag)", () => {
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

describe("opslag via useWorkoutLogs", () => {
  beforeEach(() => localStorage.clear());

  const load = async () => {
    const hook = renderHook(() => useWorkoutLogs());
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    return hook;
  };

  it("start leeg zonder opgeslagen data", async () => {
    const { result } = await load();
    expect(result.current.workouts).toEqual([]);
  });

  it("laadt workouts uit het oorspronkelijke formaat na 'herladen' (bestaande gebruikers verliezen niets)", async () => {
    const raw = JSON.stringify([legacyWorkout("w1")]);
    localStorage.setItem(LEGACY_STORAGE_KEY, raw);
    const { result } = await load();
    expect(result.current.workouts).toHaveLength(1);
    expect(result.current.workouts[0].id).toBe("w1");
    expect(result.current.workouts[0].totalVolume).toBe(720);
    // de oorspronkelijke sleutel is onaangeroerd
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBe(raw);
  });

  it("addWorkout zet nieuwste vooraan en schrijft naar localStorage (v2)", async () => {
    const { result } = await load();
    await act(async () => {
      await result.current.addWorkout(makeWorkout({ id: "a", startedAt: "2026-03-10T10:00:00.000Z" }));
    });
    await act(async () => {
      await result.current.addWorkout(makeWorkout({ id: "b", startedAt: "2026-03-10T11:00:00.000Z" }));
    });
    expect(result.current.workouts.map((w) => w.id)).toEqual(["b", "a"]);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_V2)!);
    expect(stored.workouts.map((w: { id: string }) => w.id)).toEqual(["b", "a"]);
  });

  it("data blijft behouden na 'herladen' (nieuwe hook-instantie)", async () => {
    const first = await load();
    await act(async () => {
      await first.result.current.addWorkout(makeWorkout({ id: "a" }));
    });
    first.unmount();
    const second = await load();
    expect(second.result.current.workouts.map((w) => w.id)).toEqual(["a"]);
    expect(second.result.current.workouts[0].timeZone).toBe("Europe/Brussels");
  });

  it("getRecentWorkouts beperkt het aantal", async () => {
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify([1, 2, 3].map((n) => legacyWorkout(`w${n}`, `2026-03-0${n}T12:00:00.000Z`)))
    );
    const { result } = await load();
    expect(result.current.getRecentWorkouts(2)).toHaveLength(2);
  });

  it("migreert het oudste WorkoutLog-formaat en groepeert logs op dag (middag-timestamps, tijdzone-neutraal)", async () => {
    const legacy = [
      { id: "l1", userId: "u", exercise: "Squat", sets: [{ weight: 100, reps: 5 }], date: "2026-03-10T11:00:00.000Z", volume: 500, estimated1RM: 117 },
      { id: "l2", userId: "u", exercise: "Row", sets: [{ weight: 60, reps: 8 }], date: "2026-03-10T12:00:00.000Z", volume: 480, estimated1RM: 76 },
      { id: "l3", userId: "u", exercise: "Curl", sets: [{ weight: 20, reps: 10 }], date: "2026-03-12T12:00:00.000Z", volume: 200, estimated1RM: 27 },
    ];
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacy));
    const { result } = await load();
    expect(result.current.workouts).toHaveLength(2);
    const sameDay = result.current.workouts.find((w) => w.exercises.length === 2)!;
    expect(sameDay.totalVolume).toBe(980);
    expect(sameDay.id).toBe("l1");
  });

  it("corrupte JSON wordt in quarantaine gezet en niet overschreven", async () => {
    localStorage.setItem(STORAGE_KEY_V2, "{not json");
    const { result } = await load();
    expect(result.current.workouts).toEqual([]);
    expect(result.current.storageInfo.status).toBe("corrupt");
    await act(async () => {
      await result.current.addWorkout(makeWorkout({ id: "nieuw" }));
    });
    const quarantineKey = Object.keys(localStorage).find((k) => k.includes("quarantine"));
    expect(quarantineKey).toBeDefined();
    expect(localStorage.getItem(quarantineKey!)).toBe("{not json");
    expect(result.current.workouts.map((w) => w.id)).toEqual(["nieuw"]);
  });
});

describe("PR-logica", () => {
  it("de eerste registratie van een oefening telt NIET meer als PR (gewijzigd)", () => {
    expect(checkForPR("Squat", [{ weight: 50, reps: 5 }], [])).toBe(false);
    const res = generateCoachResponse([makeExercise("Squat", [[50, 5]])], []);
    expect(res.exercises[0]).toMatchObject({ newPR: false, isFirstRecord: true, prTypes: [] });
    expect(res.message).toContain("Eerste registratie");
  });

  it("vergelijkt hoofdletterongevoelig op geschatte 1RM", () => {
    const prev = [makeWorkout()];
    expect(checkForPR("bench press", [{ weight: 60, reps: 5 }], prev)).toBe(false);
    expect(checkForPR("BENCH PRESS", [{ weight: 100, reps: 5 }], prev)).toBe(true);
  });
});
