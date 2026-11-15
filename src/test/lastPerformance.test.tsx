import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkoutForm } from "@/components/WorkoutForm";
import { findLastPerformance, findLastWorkout } from "@/utils/lastPerformance";
import { makeExercise, makeWorkout } from "./factories";

vi.mock("@/components/ExerciseSelector", () => ({
  ExerciseSelector: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input aria-label="Oefening" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock("@/components/ui/select", async () => await import("./nativeSelectMock"));

const older = makeWorkout({
  id: "a",
  startedAt: "2026-10-06T10:00:00.000Z",
  exercises: [makeExercise("Skull Crushers", [[30, 10], [30, 10]])],
});
const newer = makeWorkout({
  id: "b",
  startedAt: "2026-10-13T10:00:00.000Z",
  exercises: [makeExercise("skull-crushers", [[40, 10], [40, 9], [40, 8]]), makeExercise("Bench Press", [[80, 5]])],
});

describe("findLastPerformance", () => {
  it("neemt de meest recente keer, ook als de lijst niet gesorteerd is, en vergelijkt genormaliseerd", () => {
    const last = findLastPerformance([newer, older], "Skull Crushers");
    expect(last?.workoutId).toBe("b");
    expect(last?.sets).toEqual([{ weight: 40, reps: 10 }, { weight: 40, reps: 9 }, { weight: 40, reps: 8 }]);
    expect(last?.volume).toBe(1080);
    expect(findLastPerformance([older, newer], "Skull Crushers")?.workoutId).toBe("b");
  });
  it("geeft null zonder geschiedenis, bij een lege naam of voor een andere oefening", () => {
    expect(findLastPerformance([], "Skull Crushers")).toBeNull();
    expect(findLastPerformance([older], "")).toBeNull();
    expect(findLastPerformance([older], "Deadlift")).toBeNull();
  });
  it("slaat workouts zonder geldige starttijd en zonder geldige sets over en kan één workout uitsluiten", () => {
    const undated = makeWorkout({ id: "u", startedAt: null, exercises: [makeExercise("Skull Crushers", [[99, 9]])] });
    const empty = makeWorkout({ id: "e", startedAt: "2026-10-20T10:00:00.000Z", exercises: [makeExercise("Skull Crushers", [[0, 0]])] });
    expect(findLastPerformance([undated, empty, older], "Skull Crushers")?.workoutId).toBe("a");
    expect(findLastPerformance([older, newer], "Skull Crushers", { excludeId: "b" })?.workoutId).toBe("a");
  });
});

const values = (placeholder: string) => (screen.getAllByPlaceholderText(placeholder) as HTMLInputElement[]).map((i) => i.value);
const pick = (name: string) => fireEvent.change(screen.getByLabelText("Oefening"), { target: { value: name } });

describe("vorige keer in het formulier", () => {
  beforeEach(() => localStorage.clear());

  it("vult de sets in met de vorige keer en toont gewichten en volume", () => {
    render(<WorkoutForm onSubmit={vi.fn()} history={[older, newer]} />);
    pick("Skull Crushers");
    expect(values("Gewicht")).toEqual(["40", "40", "40"]);
    expect(values("Reps")).toEqual(["10", "9", "8"]);
    const hint = screen.getByTestId("last-performance").textContent ?? "";
    expect(hint).toContain("40 kg × 10");
    expect(hint).toContain("1.080 kg");
    // Voorgestelde sets zijn nog niet gedaan: pas na afvinken tellen ze mee.
    expect(hint).not.toContain("Nu:");
    [1, 2, 3].forEach((n) => fireEvent.click(screen.getByRole("checkbox", { name: new RegExp(`set ${n} afvinken`, "i") })));
    expect(screen.getByTestId("last-performance").textContent).toContain("gelijk aan vorige keer");
  });

  it("laat zien hoeveel je boven of onder vorige keer zit terwijl je invult", () => {
    render(<WorkoutForm onSubmit={vi.fn()} history={[newer]} />);
    pick("Skull Crushers");
    fireEvent.click(screen.getByRole("checkbox", { name: /set 1 afvinken/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /set 2 afvinken/i }));
    fireEvent.change(screen.getAllByPlaceholderText("Reps")[2], { target: { value: "10" } });
    expect(screen.getByTestId("last-performance").textContent).toContain("+80 kg boven vorige keer");
    fireEvent.change(screen.getAllByPlaceholderText("Reps")[2], { target: { value: "5" } });
    expect(screen.getByTestId("last-performance").textContent).toContain("nog 120 kg te gaan");
  });

  it("overschrijft nooit wat je zelf al hebt ingevuld, en je kunt de vorige keer alsnog overnemen", () => {
    render(<WorkoutForm onSubmit={vi.fn()} history={[newer]} />);
    fireEvent.change(screen.getAllByPlaceholderText("Gewicht")[0], { target: { value: "25" } });
    pick("Skull Crushers");
    expect(values("Gewicht")).toEqual(["25"]);
    fireEvent.click(screen.getByRole("button", { name: /vorige keer overnemen/i }));
    expect(values("Gewicht")).toEqual(["40", "40", "40"]);
    expect(screen.queryByRole("button", { name: /vorige keer overnemen/i })).toBeNull();
  });

  it("wisselen naar een oefening zonder geschiedenis haalt de overgenomen waarden weer weg", () => {
    render(<WorkoutForm onSubmit={vi.fn()} history={[newer]} />);
    pick("Skull Crushers");
    pick("Deadlift");
    expect(values("Gewicht")).toEqual([""]);
    expect(screen.queryByTestId("last-performance")).toBeNull();
  });

  it("wisselen naar een andere oefening met geschiedenis neemt die over", () => {
    render(<WorkoutForm onSubmit={vi.fn()} history={[newer]} />);
    pick("Skull Crushers");
    pick("Bench Press");
    expect(values("Gewicht")).toEqual(["80"]);
    expect(values("Reps")).toEqual(["5"]);
  });

  it("zonder history en in bewerkmodus verandert er niets", () => {
    const { unmount } = render(<WorkoutForm onSubmit={vi.fn()} />);
    pick("Skull Crushers");
    expect(values("Gewicht")).toEqual([""]);
    unmount();
    render(<WorkoutForm onSubmit={vi.fn()} history={[older, newer]} initialWorkout={older} />);
    expect(screen.queryByTestId("last-performance")).toBeNull();
    expect(values("Gewicht")).toEqual(["30", "30"]);
  });

  it("een template begint bij de vorige keer", async () => {
    render(<WorkoutForm onSubmit={vi.fn()} history={[newer]} />);
    fireEvent.click(screen.getByRole("button", { name: /kies een schema/i }));
    fireEvent.click(await waitFor(() => screen.getByRole("button", { name: /push day - advanced/i })));
    // Eerste oefening van het template is Bench Press: sets van vorige keer (1 set × 80 kg).
    expect(values("Gewicht")).toEqual(["80"]);
  });
});

describe("vorige keer per set", () => {
  it("toont per setrij wat je die set vorige keer deed, alleen waar een vorige set bestaat", () => {
    render(<WorkoutForm onSubmit={vi.fn()} history={[newer]} />);
    pick("Skull Crushers");
    fireEvent.click(screen.getByRole("button", { name: /set toevoegen/i }));
    const hints = screen.getAllByTestId("previous-set").map((e) => e.textContent);
    expect(hints).toEqual(["Vorige: 40 kg × 10", "Vorige: 40 kg × 9", "Vorige: 40 kg × 8"]);
    expect(screen.getAllByPlaceholderText("Gewicht")).toHaveLength(4);
  });
});

describe("sets afvinken", () => {
  const onSubmit = vi.fn().mockResolvedValue(true);
  beforeEach(() => {
    localStorage.clear();
    onSubmit.mockClear();
  });
  const save = () => fireEvent.click(screen.getByRole("button", { name: /training opslaan/i }));
  const check = (n: number) => screen.getByRole("checkbox", { name: new RegExp(`set ${n} `, "i") });

  it("voorgestelde sets staan uit en worden niet opgeslagen zolang je ze niet afvinkt", async () => {
    render(<WorkoutForm onSubmit={onSubmit} history={[newer]} />);
    pick("Skull Crushers");
    expect(check(1).getAttribute("aria-checked")).toBe("false");
    save();
    await new Promise((r) => setTimeout(r, 50));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("slaat alleen de afgevinkte sets op, genummerd vanaf 1", async () => {
    render(<WorkoutForm onSubmit={onSubmit} history={[newer]} />);
    pick("Skull Crushers");
    fireEvent.click(check(1));
    fireEvent.click(check(3));
    expect(check(1).getAttribute("aria-checked")).toBe("true");
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const sets = onSubmit.mock.calls[0][0][0].sets;
    expect(sets).toEqual([
      { setNumber: 1, weight: 40, reps: 10 },
      { setNumber: 2, weight: 40, reps: 8 },
    ]);
  });

  it("zelf iets aanpassen telt als gedaan; opnieuw tikken zet de set weer uit", async () => {
    render(<WorkoutForm onSubmit={onSubmit} history={[newer]} />);
    pick("Skull Crushers");
    fireEvent.change(screen.getAllByPlaceholderText("Reps")[0], { target: { value: "12" } });
    expect(check(1).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(check(1));
    expect(check(1).getAttribute("aria-checked")).toBe("false");
  });

  it("een nieuwe oefening kiezen vervangt voorgestelde sets, maar nooit afgevinkte", () => {
    render(<WorkoutForm onSubmit={onSubmit} history={[newer]} />);
    pick("Skull Crushers");
    fireEvent.click(check(1));
    pick("Bench Press");
    expect(values("Gewicht")).toEqual(["40", "40", "40"]);
  });

  it("sets zonder voorstel (zelf getypt) tellen direct mee, zoals voorheen", async () => {
    render(<WorkoutForm onSubmit={onSubmit} />);
    pick("Deadlift");
    fireEvent.change(screen.getAllByPlaceholderText("Gewicht")[0], { target: { value: "100" } });
    fireEvent.change(screen.getAllByPlaceholderText("Reps")[0], { target: { value: "5" } });
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0][0].sets).toEqual([{ setNumber: 1, weight: 100, reps: 5 }]);
  });

  it("het concept onthoudt welke sets nog niet zijn afgevinkt", () => {
    const a = render(<WorkoutForm onSubmit={onSubmit} history={[newer]} />);
    pick("Skull Crushers");
    fireEvent.click(check(2));
    a.unmount();
    render(<WorkoutForm onSubmit={onSubmit} history={[newer]} />);
    expect([1, 2, 3].map((n) => check(n).getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);
  });
});

describe("snelstart", () => {
  const pull = makeWorkout({
    id: "p",
    trainingType: "Pull",
    startedAt: "2026-10-15T10:00:00.000Z",
    exercises: [makeExercise("Barbell Row", [[60, 8], [60, 8]]), makeExercise("Lat Pulldown", [[50, 10]])],
  });
  beforeEach(() => localStorage.clear());

  it("findLastWorkout kiest de laatste van het type, of de laatste overall bij Custom", () => {
    const push = makeWorkout({ id: "q", trainingType: "Push", startedAt: "2026-10-20T10:00:00.000Z" });
    expect(findLastWorkout([pull, push], "Pull")?.id).toBe("p");
    expect(findLastWorkout([pull, push], "Custom")?.id).toBe("q");
    expect(findLastWorkout([pull, push], "Legs")).toBeNull();
    expect(findLastWorkout([], "Pull")).toBeNull();
  });

  it("laadt de oefeningen van de laatste workout met de sets van vorige keer als voorstel", () => {
    render(<WorkoutForm onSubmit={vi.fn()} history={[pull]} />);
    fireEvent.change(screen.getByLabelText("Trainingstype"), { target: { value: "Pull" } });
    fireEvent.click(screen.getByRole("button", { name: /zelfde als vorige pull/i }));
    expect((screen.getByLabelText("Oefening") as HTMLInputElement).value).toBe("Barbell Row");
    expect(values("Gewicht")).toEqual(["60", "60"]);
    expect(screen.getByRole("checkbox", { name: /set 1 afvinken/i }).getAttribute("aria-checked")).toBe("false");
    expect(screen.queryByRole("button", { name: /zelfde als/i })).toBeNull();
  });

  it("verdwijnt zodra je zelf iets invult en in bewerkmodus", () => {
    const { unmount } = render(<WorkoutForm onSubmit={vi.fn()} history={[pull]} />);
    expect(screen.getByRole("button", { name: /zelfde als laatste workout/i })).toBeTruthy();
    fireEvent.change(screen.getAllByPlaceholderText("Gewicht")[0], { target: { value: "20" } });
    expect(screen.queryByRole("button", { name: /zelfde als/i })).toBeNull();
    unmount();
    localStorage.clear();
    render(<WorkoutForm onSubmit={vi.fn()} history={[pull]} initialWorkout={pull} />);
    expect(screen.queryByRole("button", { name: /zelfde als/i })).toBeNull();
  });
});

import { calculateVolumeFromSets, getBest1RMFromSets, summarizeExerciseSets, suggestWarmups } from "@/utils/fitnessCalculations";
import { loadDraft, saveDraft } from "@/utils/workoutDraft";
import { normalizeWorkout } from "@/utils/workoutNormalization";
import { buildSessions, personalRecords } from "@/utils/statistics";
import { detectPRs } from "@/utils/fitnessCalculations";
import { MemoryStorage } from "./factories";

describe("opwarmsets: berekeningen", () => {
  const bench = [
    { weight: 20, reps: 12, isWarmup: true },
    { weight: 60, reps: 8, isWarmup: true },
    { weight: 80, reps: 6 },
    { weight: 100, reps: 2 },
    { weight: 80, reps: 8 },
  ];

  it("volume, 1RM en samenvatting tellen alleen werksets", () => {
    expect(calculateVolumeFromSets(bench)).toBe(80 * 6 + 100 * 2 + 80 * 8);
    expect(getBest1RMFromSets(bench)).toBe(Math.max(...[[80, 6], [100, 2], [80, 8]].map(([w, r]) => Math.round(w * (1 + r / 30)))));
    const s = summarizeExerciseSets(bench);
    expect(s.setCount).toBe(3);
    expect(s.maxWeight).toBe(100);
    expect(s.totalReps).toBe(16);
  });

  it("zonder markering verandert er niets (bestaande data blijft werksets)", () => {
    const old = bench.map(({ weight, reps }) => ({ weight, reps }));
    expect(summarizeExerciseSets(old).setCount).toBe(5);
    expect(calculateVolumeFromSets(old)).toBe(20 * 12 + 60 * 8 + 80 * 6 + 100 * 2 + 80 * 8);
  });

  it("een opwarmset van 140 kg breekt nooit een record", () => {
    const earlier = makeWorkout({ id: "e", startedAt: "2026-10-01T10:00:00.000Z", exercises: [makeExercise("Bench Press", [[100, 5]])] });
    const { prTypes } = detectPRs([{ weight: 140, reps: 1, isWarmup: true }, { weight: 90, reps: 5 }], "Bench Press", [earlier]);
    expect(prTypes).toEqual([]);
  });

  it("statistieken: records en sessies negeren opwarmsets, maar tellen ze apart", () => {
    const w = makeWorkout({
      id: "s",
      startedAt: "2026-10-05T10:00:00.000Z",
      exercises: [{ ...makeExercise("Bench Press", [[60, 8]]), sets: [{ setNumber: 1, weight: 150, reps: 1, isWarmup: true }, { setNumber: 2, weight: 80, reps: 5 }] }],
    });
    const { sessions } = buildSessions([w]);
    expect(sessions[0].exercises[0].warmupCount).toBe(1);
    expect(sessions[0].exercises[0].stats.maxWeight).toBe(80);
    expect(personalRecords(sessions)[0].records.maxWeight?.value).toBe(80);
  });

  it("normalisatie behoudt de markering en re-berekent totalen zonder opwarmsets", () => {
    const { workout } = normalizeWorkout({
      ...makeWorkout({ id: "n" }),
      exercises: [{ exercise: "Bench Press", sets: [{ setNumber: 1, weight: 20, reps: 10, isWarmup: true }, { setNumber: 2, weight: 100, reps: 5 }, { setNumber: 3, weight: 50, reps: 5, isWarmup: "ja" }] }],
    });
    expect(workout!.exercises[0].sets.map((s) => s.isWarmup)).toEqual([true, undefined, undefined]);
    expect(workout!.exercises[0].volume).toBe(100 * 5 + 50 * 5);
    expect(workout!.totalVolume).toBe(750);
  });
});

describe("suggestWarmups", () => {
  it("markeert lichte sets vóór de zwaarste set", () => {
    expect(suggestWarmups([{ weight: 20, reps: 12 }, { weight: 60, reps: 8 }, { weight: 80, reps: 6 }, { weight: 100, reps: 2 }, { weight: 80, reps: 8 }])).toEqual([true, true, false, false, false]);
    expect(suggestWarmups([{ weight: 45, reps: 12 }, { weight: 59, reps: 12 }, { weight: 73, reps: 8 }, { weight: 79, reps: 3 }, { weight: 59, reps: 5 }])).toEqual([true, true, false, false, false]);
  });
  it("geeft niets voor gelijke gewichten, een set, lege of ongeldige invoer", () => {
    expect(suggestWarmups([{ weight: 30, reps: 10 }, { weight: 30, reps: 10 }])).toEqual([false, false]);
    expect(suggestWarmups([{ weight: 50, reps: 5 }])).toEqual([false]);
    expect(suggestWarmups([{ weight: NaN, reps: 5 }, { weight: 0, reps: 0 }])).toEqual([false, false]);
    expect(suggestWarmups([])).toEqual([]);
  });
});

describe("opwarmsets in het concept", () => {
  it("het concept onthoudt welke sets opwarmen zijn", () => {
    const storage = new MemoryStorage();
    saveDraft(storage, [{ exercise: "Bench Press", sets: [{ weight: "20", reps: "10", warmup: true }, { weight: "100", reps: "5" }], notes: "", isExpanded: true }], "Push");
    const d = loadDraft(storage)!;
    expect(d.exercises[0].sets.map((s) => s.warmup)).toEqual([true, undefined]);
  });
});

describe("opwarmsets in het formulier", () => {
  beforeEach(() => localStorage.clear());
  const onSubmit = vi.fn().mockResolvedValue(true);
  beforeEach(() => onSubmit.mockClear());
  const fill = (i: number, w: string, r: string) => {
    fireEvent.change(screen.getAllByPlaceholderText("Gewicht")[i], { target: { value: w } });
    fireEvent.change(screen.getAllByPlaceholderText("Reps")[i], { target: { value: r } });
  };
  const warm = (n: number) => screen.getByRole("button", { name: new RegExp(`set ${n} opwarmset`, "i") });

  it("sla op met opwarmsets gemarkeerd: ze staan erbij maar tellen niet mee in volume", async () => {
    render(<WorkoutForm onSubmit={onSubmit} />);
    pick("Bench Press");
    fill(0, "20", "10");
    fireEvent.click(screen.getByRole("button", { name: /set toevoegen/i }));
    fill(1, "100", "5");
    fireEvent.click(warm(1));
    expect(warm(1).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: /training opslaan/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const ex = onSubmit.mock.calls[0][0][0];
    expect(ex.sets).toEqual([{ setNumber: 1, weight: 20, reps: 10, isWarmup: true }, { setNumber: 2, weight: 100, reps: 5 }]);
    expect(ex.volume).toBe(500);
  });

  it("de knop 'lichte sets markeren' stelt voor en laat jou kiezen", () => {
    render(<WorkoutForm onSubmit={onSubmit} />);
    pick("Bench Press");
    fill(0, "20", "10");
    fireEvent.click(screen.getByRole("button", { name: /set toevoegen/i }));
    fill(1, "60", "8");
    fireEvent.click(screen.getByRole("button", { name: /set toevoegen/i }));
    fill(2, "100", "5");
    fireEvent.click(screen.getByRole("button", { name: /lichte sets vooraf/i }));
    expect([1, 2, 3].map((n) => warm(n).getAttribute("aria-pressed"))).toEqual(["true", "true", "false"]);
    expect(screen.queryByRole("button", { name: /lichte sets vooraf/i })).toBeNull();
    fireEvent.click(warm(2)); // zelf aanpassen
    expect(warm(2).getAttribute("aria-pressed")).toBe("false");
  });

  it("vorige keer neemt de opwarmmarkering mee en het verschil telt alleen werksets", () => {
    const prev = makeWorkout({
      id: "h",
      startedAt: "2026-10-13T10:00:00.000Z",
      exercises: [{ ...makeExercise("Bench Press", [[60, 8]]), sets: [{ setNumber: 1, weight: 20, reps: 10, isWarmup: true }, { setNumber: 2, weight: 100, reps: 5 }] }],
    });
    render(<WorkoutForm onSubmit={onSubmit} history={[prev]} />);
    pick("Bench Press");
    expect([1, 2].map((n) => warm(n).getAttribute("aria-pressed"))).toEqual(["true", "false"]);
    const hint = screen.getByTestId("last-performance").textContent ?? "";
    expect(hint).toContain("Volume: 500 kg"); // 20 × 10 telt niet mee
    fireEvent.click(screen.getByRole("checkbox", { name: /set 1 afvinken/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /set 2 afvinken/i }));
    expect(screen.getByTestId("last-performance").textContent).toContain("gelijk aan vorige keer");
  });

  it("een keer met alleen opwarmsets telt niet als vorige keer", () => {
    expect(
      findLastPerformance(
        [makeWorkout({ id: "o", exercises: [{ ...makeExercise("Bench Press", [[20, 10]]), sets: [{ setNumber: 1, weight: 20, reps: 10, isWarmup: true }] }] })],
        "Bench Press"
      )
    ).toBeNull();
  });
});
