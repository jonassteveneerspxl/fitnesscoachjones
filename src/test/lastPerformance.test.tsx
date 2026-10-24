import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkoutForm } from "@/components/WorkoutForm";
import { findLastPerformance } from "@/utils/lastPerformance";
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
    expect(hint).toContain("gelijk aan vorige keer");
  });

  it("laat zien hoeveel je boven of onder vorige keer zit terwijl je invult", () => {
    render(<WorkoutForm onSubmit={vi.fn()} history={[newer]} />);
    pick("Skull Crushers");
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
    fireEvent.click(screen.getByRole("button", { name: /kies workout template/i }));
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
