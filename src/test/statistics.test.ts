import { describe, it, expect } from "vitest";
import type { TrainingType, Workout } from "@/types/workout";
import {
  assessDataQuality,
  buildSessions,
  compareWithPrevious,
  compareWorkoutTotals,
  countPerPeriod,
  exerciseProgression,
  filterSessions,
  listExercises,
  personalRecords,
  resolvePeriod,
  summarize,
  volumePerPeriod,
  volumePerSession,
} from "@/utils/statistics";
import { makeExercise, makeWorkout } from "./factories";

const BRU = "Europe/Brussels";
const LA = "America/Los_Angeles";
const AKL = "Pacific/Auckland";

let counter = 0;
const w = (
  startedAt: string | null,
  exercises: ReturnType<typeof makeExercise>[],
  over: Partial<Workout> = {}
): Workout => makeWorkout({ id: `w${++counter}`, startedAt, exercises, timeZone: BRU, ...over });

const bench = (...pairs: [number, number][]) => makeExercise("Bench Press", pairs);
const squat = (...pairs: [number, number][]) => makeExercise("Squat", pairs);

describe("buildSessions: datum, tijdzone en volgorde", () => {
  const instant = "2026-03-10T23:30:00.000Z";

  it("rekent de kalenderdag uit in de OPGESLAGEN tijdzone van de workout", () => {
    const inBru = buildSessions([w(instant, [bench([80, 5])], { timeZone: BRU })], AKL).sessions[0];
    const inLa = buildSessions([w(instant, [bench([80, 5])], { timeZone: LA })], AKL).sessions[0];
    const inAkl = buildSessions([w(instant, [bench([80, 5])], { timeZone: AKL })], BRU).sessions[0];
    expect(inBru.dateKey).toBe("2026-03-11"); // 00:30 CET
    expect(inLa.dateKey).toBe("2026-03-10"); // 16:30 PDT
    expect(inAkl.dateKey).toBe("2026-03-11"); // 12:30 NZDT
  });

  it("valt terug op de tijdzone van het toestel als de workout er geen heeft", () => {
    const noTz = w(instant, [bench([80, 5])], { timeZone: null });
    expect(buildSessions([noTz], LA).sessions[0].dateKey).toBe("2026-03-10");
    expect(buildSessions([noTz], AKL).sessions[0].dateKey).toBe("2026-03-11");
  });

  it("zet workouts zonder of met ongeldige datum apart en verzint geen datum", () => {
    const built = buildSessions([
      w(null, [bench([80, 5])]),
      w("niet-een-datum", [bench([80, 5])]),
      w("2026-03-10T10:00:00.000Z", [bench([80, 5])]),
    ]);
    expect(built.sessions).toHaveLength(1);
    expect(built.undated).toHaveLength(2);
  });

  it("sorteert chronologisch ongeacht invoervolgorde en houdt gelijke momenten stabiel", () => {
    const a = w("2026-03-12T10:00:00.000Z", [bench([80, 5])]);
    const b = w("2026-03-10T10:00:00.000Z", [bench([80, 5])]);
    const c = w("2026-03-10T10:00:00.000Z", [bench([80, 5])]);
    const ids = buildSessions([a, b, c]).sessions.map((s) => s.workoutId);
    expect(ids).toEqual([b.id, c.id, a.id]);
  });

  it("verandert de invoer niet", () => {
    const input = [w("2026-03-10T10:00:00.000Z", [bench([80, 5])])];
    const before = JSON.stringify(input);
    const built = buildSessions(input);
    filterSessions(built.sessions, { exerciseKey: "bench press" });
    expect(JSON.stringify(input)).toBe(before);
  });
});

describe("ISO-weken en maanden", () => {
  it("zondag 23:30 en maandag 00:30 lokale tijd vallen in verschillende ISO-weken", () => {
    const sun = w("2026-03-08T22:30:00.000Z", [bench([80, 5])], { timeZone: BRU }); // zo 23:30 CET
    const mon = w("2026-03-08T23:30:00.000Z", [bench([80, 5])], { timeZone: BRU }); // ma 00:30 CET
    const [s1, s2] = buildSessions([sun, mon]).sessions;
    expect(s1.weekKey).toBe("2026-W10");
    expect(s2.weekKey).toBe("2026-W11");
  });

  it("hetzelfde moment valt in een andere week afhankelijk van de opgeslagen tijdzone", () => {
    const at = "2026-03-08T23:30:00.000Z";
    expect(buildSessions([w(at, [bench([80, 5])], { timeZone: BRU })]).sessions[0].weekKey).toBe("2026-W11");
    expect(buildSessions([w(at, [bench([80, 5])], { timeZone: LA })]).sessions[0].weekKey).toBe("2026-W10");
  });

  it("jaarwissel: 31 dec 2026 en 1 jan 2027 zijn week 53 van 2026; 4 jan 2027 is week 1", () => {
    const keys = buildSessions([
      w("2026-12-31T12:00:00.000Z", [bench([80, 5])]),
      w("2027-01-01T12:00:00.000Z", [bench([80, 5])]),
      w("2027-01-04T12:00:00.000Z", [bench([80, 5])]),
    ]).sessions.map((s) => s.weekKey);
    expect(keys).toEqual(["2026-W53", "2026-W53", "2027-W01"]);
  });
});

describe("countPerPeriod", () => {
  const sessions = buildSessions([
    w("2026-03-02T10:00:00.000Z", [bench([80, 5])]), // W10
    w("2026-03-04T10:00:00.000Z", [bench([80, 5])]), // W10
    w("2026-03-04T18:00:00.000Z", [squat([100, 5])]), // W10, zelfde dag = aparte sessie
    w("2026-03-23T10:00:00.000Z", [bench([80, 5])]), // W13
    w("2026-04-02T10:00:00.000Z", [bench([80, 5])]), // W14, april
  ]).sessions;

  it("telt meerdere trainingen op dezelfde dag afzonderlijk en vult lege weken met 0", () => {
    const weeks = countPerPeriod(sessions, "week");
    expect(weeks.map((x) => x.key)).toEqual(["2026-W10", "2026-W11", "2026-W12", "2026-W13", "2026-W14"]);
    expect(weeks.map((x) => x.count)).toEqual([3, 0, 0, 1, 1]);
  });

  it("telt per maand", () => {
    expect(countPerPeriod(sessions, "month")).toEqual([
      { key: "2026-03", count: 4 },
      { key: "2026-04", count: 1 },
    ]);
  });

  it("breidt uit tot het gevraagde bereik met nullen", () => {
    const weeks = countPerPeriod(sessions, "week", { from: "2026-02-23", to: "2026-04-05" });
    expect(weeks[0]).toEqual({ key: "2026-W09", count: 0 });
    expect(weeks.at(-1)).toEqual({ key: "2026-W14", count: 1 });
  });

  it("geeft een lege lijst zonder sessies", () => {
    expect(countPerPeriod([], "week")).toEqual([]);
    expect(countPerPeriod([], "month")).toEqual([]);
  });
});

describe("volume: herberekend uit sets, nooit uit opgeslagen totalen", () => {
  it("negeert verkeerde opgeslagen volumes", () => {
    const wrong = w("2026-03-10T10:00:00.000Z", [bench([80, 5], [80, 4])], { totalVolume: 99999 });
    wrong.exercises[0].volume = 99999;
    const [point] = volumePerSession(buildSessions([wrong]).sessions);
    expect(point.volume).toBe(720);
  });

  it("geeft null (niet 0) voor een training zonder geldige sets en negeert ongeldige sets", () => {
    const empty = w("2026-03-10T10:00:00.000Z", [makeExercise("Bench Press", [])], { totalVolume: 500 });
    const bad = w("2026-03-11T10:00:00.000Z", [bench([80, 5])]);
    bad.exercises[0].sets.push({ setNumber: 2, weight: Number.NaN, reps: 5 }, { setNumber: 3, weight: 50, reps: 0 });
    const points = volumePerSession(buildSessions([empty, bad]).sessions);
    expect(points.map((p) => p.volume)).toEqual([null, 400]);
  });

  it("gewicht van één set is niet hetzelfde als volume", () => {
    const [s] = buildSessions([w("2026-03-10T10:00:00.000Z", [bench([100, 5], [90, 8])])]).sessions;
    expect(s.exercises[0].stats.maxWeight).toBe(100);
    expect(s.exercises[0].stats.exerciseVolume).toBe(500 + 720);
    expect(s.exercises[0].stats.bestSetVolume).toBe(720);
  });

  it("volumePerPeriod telt op en toont 0 voor weken zonder training", () => {
    const { sessions } = buildSessions([
      w("2026-03-02T10:00:00.000Z", [bench([80, 5])]),
      w("2026-03-04T10:00:00.000Z", [bench([80, 5]), squat([100, 5])]),
      w("2026-03-16T10:00:00.000Z", [bench([100, 5])]),
    ]);
    expect(volumePerPeriod(sessions, "week")).toEqual([
      { key: "2026-W10", volume: 400 + 900 },
      { key: "2026-W11", volume: 0 },
      { key: "2026-W12", volume: 500 },
    ]);
  });
});

describe("filters", () => {
  const { sessions } = buildSessions([
    w("2026-03-02T10:00:00.000Z", [bench([80, 5])], { trainingType: "Push" as TrainingType }),
    w("2026-03-05T10:00:00.000Z", [squat([100, 5])], { trainingType: "Legs" as TrainingType }),
    w("2026-03-09T10:00:00.000Z", [bench([85, 5]), squat([105, 5])], { trainingType: "Full Body" as TrainingType }),
  ]);

  it("periode is inclusief begin- en einddag", () => {
    expect(filterSessions(sessions, { from: "2026-03-05", to: "2026-03-09" })).toHaveLength(2);
    expect(filterSessions(sessions, { from: "2026-03-06" })).toHaveLength(1);
    expect(filterSessions(sessions, { to: "2026-03-04" })).toHaveLength(1);
  });

  it("filtert op trainingstype; leeg betekent alle types", () => {
    expect(filterSessions(sessions, { trainingTypes: ["Push"] })).toHaveLength(1);
    expect(filterSessions(sessions, { trainingTypes: ["Push", "Legs"] })).toHaveLength(2);
    expect(filterSessions(sessions, { trainingTypes: [] })).toHaveLength(3);
  });

  it("oefeningfilter houdt alleen sessies met die oefening en rekent het volume alleen over die oefening", () => {
    const only = filterSessions(sessions, { exerciseKey: "bench press" });
    expect(only).toHaveLength(2);
    expect(only[1].exercises).toHaveLength(1);
    expect(only[1].volume).toBe(85 * 5);
    expect(summarize(only).totalVolume).toBe(400 + 425);
  });

  it("combineert filters", () => {
    expect(filterSessions(sessions, { trainingTypes: ["Full Body"], exerciseKey: "squat", from: "2026-03-01" })).toHaveLength(1);
    expect(filterSessions(sessions, { trainingTypes: ["Push"], exerciseKey: "squat" })).toHaveLength(0);
  });

  it("past de oorspronkelijke sessies niet aan", () => {
    filterSessions(sessions, { exerciseKey: "bench press" });
    expect(sessions[2].exercises).toHaveLength(2);
  });
});

describe("resolvePeriod", () => {
  it("rekent presets uit vanaf vandaag", () => {
    expect(resolvePeriod("all", "2026-05-31")).toEqual({ from: null, to: null });
    expect(resolvePeriod("4w", "2026-05-31")).toEqual({ from: "2026-05-04", to: "2026-05-31" });
    expect(resolvePeriod("3m", "2026-05-31")).toEqual({ from: "2026-02-28", to: "2026-05-31" });
    expect(resolvePeriod("12m", "2026-05-31")).toEqual({ from: "2025-05-31", to: "2026-05-31" });
    expect(resolvePeriod("ytd", "2026-05-31")).toEqual({ from: "2026-01-01", to: "2026-05-31" });
  });

  it("neemt aangepaste grenzen over en behandelt leeg als onbegrensd", () => {
    expect(resolvePeriod("custom", "2026-05-31", { from: "2026-01-10", to: "" })).toEqual({ from: "2026-01-10", to: null });
  });
});

describe("listExercises en normalisatie", () => {
  it("voegt schrijfwijzen samen en toont de meest recente", () => {
    const { sessions } = buildSessions([
      w("2026-03-01T10:00:00.000Z", [makeExercise("Push-Ups", [[0, 10]])]),
      w("2026-03-03T10:00:00.000Z", [makeExercise("push ups", [[0, 12]])]),
      w("2026-03-05T10:00:00.000Z", [makeExercise("Push-ups", [[0, 15]])]),
      w("2026-03-06T10:00:00.000Z", [bench([80, 5])]),
    ]);
    const options = listExercises(sessions);
    expect(options).toEqual([
      { key: "push ups", name: "Push-ups", sessions: 3 },
      { key: "bench press", name: "Bench Press", sessions: 1 },
    ]);
  });

  it("neemt oefeningen zonder geldige sets niet op", () => {
    const { sessions } = buildSessions([w("2026-03-01T10:00:00.000Z", [makeExercise("Squat", [])])]);
    expect(listExercises(sessions)).toEqual([]);
  });
});

describe("exerciseProgression", () => {
  it("geeft per sessie gewicht, herhalingen en volume, en slaat sessies zonder sets over", () => {
    const { sessions } = buildSessions([
      w("2026-03-01T10:00:00.000Z", [bench([80, 5], [80, 5])]),
      w("2026-03-03T10:00:00.000Z", [makeExercise("Bench Press", [])]),
      w("2026-03-05T10:00:00.000Z", [bench([85, 5], [80, 8])]),
    ]);
    const points = exerciseProgression(sessions, "bench press");
    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({ dateKey: "2026-03-01", maxWeight: 80, totalReps: 10, maxReps: 5, exerciseVolume: 800, setCount: 2 });
    expect(points[1]).toMatchObject({ dateKey: "2026-03-05", maxWeight: 85, totalReps: 13, maxReps: 8, exerciseVolume: 425 + 640 });
  });
});

describe("personalRecords", () => {
  const { sessions } = buildSessions([
    w("2026-03-01T10:00:00.000Z", [bench([80, 5], [80, 5])]),
    w("2026-03-08T10:00:00.000Z", [bench([90, 3])]),
    w("2026-03-15T10:00:00.000Z", [bench([80, 5], [80, 5], [80, 5])]),
    w("2026-03-22T10:00:00.000Z", [bench([90, 3])]), // gelijk aan eerder record
    w("2026-03-29T10:00:00.000Z", [makeExercise("Push-Ups", [[0, 30]])]),
  ]);
  const [benchRecords] = personalRecords(sessions, "bench press");

  it("bepaalt de vier recordtypes met datum", () => {
    expect(benchRecords.records.maxWeight).toMatchObject({ value: 90, dateKey: "2026-03-08", weight: 90, reps: 3 });
    expect(benchRecords.records.bestSetVolume).toMatchObject({ value: 400, dateKey: "2026-03-01" });
    expect(benchRecords.records.bestExerciseVolume).toMatchObject({ value: 1200, dateKey: "2026-03-15", setCount: 3 });
    expect(benchRecords.records.best1RM).toMatchObject({ dateKey: "2026-03-08" });
  });

  it("behoudt bij gelijke waarden het eerste record", () => {
    expect(benchRecords.records.maxWeight?.dateKey).toBe("2026-03-08");
  });

  it("bodyweight (gewicht 0) levert geen record op en breekt niets", () => {
    const pushups = personalRecords(sessions, "push ups")[0];
    expect(pushups.records).toEqual({ maxWeight: null, bestSetVolume: null, bestExerciseVolume: null, best1RM: null });
  });

  it("geeft alle oefeningen alfabetisch zonder oefeningfilter", () => {
    expect(personalRecords(sessions).map((r) => r.exerciseName)).toEqual(["Bench Press", "Push-Ups"]);
  });
});

describe("compareWithPrevious", () => {
  const all = buildSessions([
    w("2026-03-01T10:00:00.000Z", [bench([80, 5], [80, 5])], { trainingType: "Push" }),
    w("2026-03-03T10:00:00.000Z", [squat([100, 5])], { trainingType: "Legs" }),
    w("2026-03-05T10:00:00.000Z", [makeExercise("Bench Press", [])], { trainingType: "Push" }), // geen sets
    w("2026-03-08T10:00:00.000Z", [bench([85, 5], [85, 5])], { trainingType: "Push" }),
    w("2026-03-12T10:00:00.000Z", [bench([85, 3], [85, 3])], { trainingType: "Push" }),
    w("2026-03-15T10:00:00.000Z", [bench([90, 3]), makeExercise("Deadlift", [[120, 5]])], { trainingType: "Pull" }),
  ]).sessions;
  const at = (n: number) => all[n];

  it("een oefening zonder eerdere sessie is 'first' en heeft geen delta's", () => {
    const [row] = compareWithPrevious(all, at(0));
    expect(row.status).toBe("first");
    expect(row.previous).toBeNull();
    expect(row.exerciseVolume).toBeNull();
  });

  it("vergelijkt met de vorige sessie met geldige sets en slaat een sessie zonder sets over", () => {
    const [row] = compareWithPrevious(all, at(3));
    expect(row.previousDateKey).toBe("2026-03-01");
    expect(row.maxWeight).toMatchObject({ current: 85, previous: 80, diff: 5, percent: 6.3 });
    expect(row.exerciseVolume).toMatchObject({ current: 850, previous: 800, diff: 50 });
    expect(row.status).toBe("up");
  });

  it("herkent achteruitgang, gelijk en gemengd", () => {
    expect(compareWithPrevious(all, at(4))[0].status).toBe("down"); // zelfde gewicht, minder volume
    const mixed = buildSessions([
      w("2026-03-01T10:00:00.000Z", [bench([80, 10])]),
      w("2026-03-08T10:00:00.000Z", [bench([100, 2])]),
    ]).sessions;
    expect(compareWithPrevious(mixed, mixed[1])[0].status).toBe("mixed"); // zwaarder maar minder volume
    const same = buildSessions([
      w("2026-03-01T10:00:00.000Z", [bench([80, 5])]),
      w("2026-03-08T10:00:00.000Z", [bench([80, 5])]),
    ]).sessions;
    expect(compareWithPrevious(same, same[1])[0].status).toBe("same");
  });

  it("zoekt de vorige sessie in de volledige historie, ook als een filter actief is", () => {
    const onlyPull = filterSessions(all, { trainingTypes: ["Pull"] });
    const [row] = compareWithPrevious(all, onlyPull[0]);
    expect(row.exerciseName).toBe("Bench Press");
    expect(row.previousDateKey).toBe("2026-03-12");
  });

  it("andere oefeningen worden niet met elkaar vergeleken", () => {
    const rows = compareWithPrevious(all, at(5));
    expect(rows.find((r) => r.exerciseName === "Deadlift")?.status).toBe("first");
  });

  it("procent is null als de vorige waarde 0 is", () => {
    const s = buildSessions([
      w("2026-03-01T10:00:00.000Z", [makeExercise("Push-Ups", [[0, 10]])]),
      w("2026-03-08T10:00:00.000Z", [makeExercise("Push-Ups", [[0, 15]])]),
    ]).sessions;
    const row = compareWithPrevious(s, s[1])[0];
    expect(row.exerciseVolume?.percent).toBeNull();
    expect(row.totalReps).toMatchObject({ diff: 5, percent: 50 });
  });
});

describe("compareWorkoutTotals", () => {
  const all = buildSessions([
    w("2026-03-01T10:00:00.000Z", [bench([80, 5])], { trainingType: "Push" }),
    w("2026-03-02T10:00:00.000Z", [squat([100, 5])], { trainingType: "Legs" }),
    w("2026-03-04T10:00:00.000Z", [makeExercise("Bench Press", [])], { trainingType: "Push" }),
    w("2026-03-08T10:00:00.000Z", [bench([85, 5])], { trainingType: "Push" }),
    w("2026-03-09T10:00:00.000Z", [squat([110, 5])], { trainingType: "Custom" }),
  ]).sessions;

  it("vergelijkt met de vorige training van hetzelfde type en slaat trainingen zonder sets over", () => {
    const cmp = compareWorkoutTotals(all, all[3]);
    expect(cmp.previousDateKey).toBe("2026-03-01");
    expect(cmp.volume).toMatchObject({ current: 425, previous: 400, diff: 25 });
  });

  it("gebruikt bij Custom/Onbekend de vorige training in het algemeen", () => {
    expect(compareWorkoutTotals(all, all[4]).previousDateKey).toBe("2026-03-08");
  });

  it("geeft niets terug voor de eerste training of een training zonder setgegevens", () => {
    expect(compareWorkoutTotals(all, all[0]).volume).toBeNull();
    expect(compareWorkoutTotals(all, all[2]).volume).toBeNull();
  });
});

describe("datakwaliteit en samenvatting", () => {
  it("rapporteert workouts zonder datum en zonder setgegevens in plaats van ze te verbergen", () => {
    const built = buildSessions([
      w(null, [bench([80, 5])]),
      w("2026-03-01T10:00:00.000Z", [makeExercise("Bench Press", [])]),
      w("2026-03-02T10:00:00.000Z", [bench([80, 5])]),
    ]);
    expect(assessDataQuality(built)).toEqual({ totalWorkouts: 3, withoutDate: 1, withoutSetData: 1 });
    expect(summarize(built.sessions)).toEqual({ sessions: 2, totalVolume: 400, exercises: 1 });
  });
});
