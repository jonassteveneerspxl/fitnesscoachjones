import { describe, it, expect } from "vitest";
import { detectPRs, getPreviousBests, summarizeExerciseSets } from "@/utils/fitnessCalculations";
import { makeExercise, makeSets, makeWorkout } from "./factories";

const history = (...sessions: [string, [number, number][]][]) =>
  sessions.map(([name, pairs], i) =>
    makeWorkout({ id: `h${i}`, exercises: [makeExercise(name, pairs)] })
  );

describe("summarizeExerciseSets: gewicht van één set ≠ volume van de oefening", () => {
  it("geeft aparte kerncijfers", () => {
    const s = summarizeExerciseSets(makeSets([100, 5], [80, 10]));
    expect(s.maxWeight).toBe(100);
    expect(s.bestSetVolume).toBe(800); // 80 × 10
    expect(s.exerciseVolume).toBe(500 + 800);
    expect(s.totalReps).toBe(15);
    expect(s.maxReps).toBe(10);
    expect(s.setCount).toBe(2);
  });

  it("negeert ongeldige sets (NaN, negatief, 0 reps) in plaats van NaN door te geven", () => {
    const s = summarizeExerciseSets([
      { weight: NaN, reps: 5 },
      { weight: 50, reps: 0 },
      { weight: -10, reps: 5 },
      { weight: 60, reps: 5 },
    ]);
    expect(s.setCount).toBe(1);
    expect(s.exerciseVolume).toBe(300);
  });
});

describe("detectPRs", () => {
  it("eerste registratie is een uitgangspunt en GEEN record", () => {
    expect(detectPRs(makeSets([100, 5]), "Squat", [])).toEqual({ isFirstRecord: true, prTypes: [] });
  });

  it("een eerdere sessie zonder geldige sets telt niet als eerdere registratie", () => {
    const prev = history(["Squat", []]);
    expect(detectPRs(makeSets([100, 5]), "Squat", prev).isFirstRecord).toBe(true);
  });

  it("meldt maxWeight bij een zwaardere set", () => {
    const prev = history(["Squat", [[100, 5]]]);
    expect(detectPRs(makeSets([105, 3]), "Squat", prev).prTypes).toContain("maxWeight");
  });

  it("meldt bestSetVolume zonder maxWeight als alleen reps omhoog gaan", () => {
    const prev = history(["Squat", [[100, 5]]]);
    const { prTypes } = detectPRs(makeSets([100, 7]), "Squat", prev);
    expect(prTypes).toContain("bestSetVolume");
    expect(prTypes).not.toContain("maxWeight");
  });

  it("meldt bestExerciseVolume zonder betere enkele set als er méér sets worden gedaan", () => {
    const prev = history(["Squat", [[100, 5], [100, 5]]]);
    const { prTypes } = detectPRs(makeSets([100, 5], [100, 5], [100, 5]), "Squat", prev);
    expect(prTypes).toEqual(["bestExerciseVolume"]);
  });

  it("meldt best1RM", () => {
    const prev = history(["Squat", [[100, 5]]]);
    expect(detectPRs(makeSets([100, 8]), "Squat", prev).prTypes).toContain("best1RM");
  });

  it("gelijke waarde is geen record (strikt hoger vereist)", () => {
    const prev = history(["Squat", [[100, 5]]]);
    expect(detectPRs(makeSets([100, 5]), "Squat", prev)).toEqual({ isFirstRecord: false, prTypes: [] });
  });

  it("een lichtere sessie is geen record", () => {
    const prev = history(["Squat", [[100, 5]]]);
    expect(detectPRs(makeSets([90, 5]), "Squat", prev).prTypes).toEqual([]);
  });

  it("vergelijkt met de BESTE eerdere waarde per type, niet alleen de laatste sessie", () => {
    const prev = history(["Squat", [[120, 3]]], ["Squat", [[80, 5]]]);
    expect(detectPRs(makeSets([110, 3]), "Squat", prev).prTypes).not.toContain("maxWeight");
  });

  it("normaliseert oefennamen: hoofdletters, koppeltekens en witruimte", () => {
    const prev = history(["Push-Ups", [[10, 10]]]);
    const r = detectPRs(makeSets([15, 10]), "  push ups ", prev);
    expect(r.isFirstRecord).toBe(false);
    expect(r.prTypes).toContain("maxWeight");
  });

  it("andere oefeningen beïnvloeden elkaar niet", () => {
    const prev = history(["Bench Press", [[200, 5]]]);
    expect(detectPRs(makeSets([50, 5]), "Squat", prev).isFirstRecord).toBe(true);
  });

  it("bodyweight (gewicht 0) kan geen gewicht- of volumerecord zijn", () => {
    const prev = history(["Push-Ups", [[0, 20]]]);
    expect(detectPRs(makeSets([0, 30]), "Push-Ups", prev)).toEqual({ isFirstRecord: false, prTypes: [] });
  });

  it("geen geldige sets → geen record en geen 'eerste registratie'", () => {
    expect(detectPRs([], "Squat", [])).toEqual({ isFirstRecord: false, prTypes: [] });
  });
});

describe("getPreviousBests", () => {
  it("is null voor een nooit geregistreerde oefening", () => {
    expect(getPreviousBests("Squat", history(["Bench Press", [[80, 5]]]))).toBeNull();
  });
});
