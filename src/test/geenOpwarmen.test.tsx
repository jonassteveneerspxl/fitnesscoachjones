import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WorkoutForm } from "@/components/WorkoutForm";
import { calculateVolumeFromSets, getBest1RMFromSets } from "@/utils/fitnessCalculations";
import { makeExercise, makeWorkout } from "./factories";

vi.mock("@/components/ExerciseSelector", () => ({
  ExerciseSelector: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input aria-label="Oefening" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock("@/components/ui/select", async () => await import("./nativeSelectMock"));

describe("geen opwarmsets en geen rusttimer meer", () => {
  it("een oude opwarmmarkering in opgeslagen data telt gewoon mee", () => {
    const sets = [
      { weight: 40, reps: 10, isWarmup: true },
      { weight: 100, reps: 5 },
    ];
    expect(calculateVolumeFromSets(sets)).toBe(900);
    expect(getBest1RMFromSets(sets)).toBeGreaterThan(110);
  });

  it("het formulier heeft geen opwarmknop en toont na afvinken geen timer", () => {
    const prev = makeWorkout({ id: "p", startedAt: "2026-10-13T10:00:00.000Z", exercises: [makeExercise("Bench Press", [[40, 10], [100, 5]])] });
    render(<WorkoutForm onSubmit={vi.fn()} history={[prev]} />);
    fireEvent.change(screen.getByLabelText("Oefening"), { target: { value: "Bench Press" } });
    expect(screen.queryByRole("button", { name: /opwarm/i })).toBeNull();
    expect(screen.queryByText(/lichte sets/i)).toBeNull();
    const ticks = screen.getAllByRole("checkbox");
    fireEvent.click(ticks[0]);
    expect(screen.queryByRole("timer")).toBeNull();
    expect(screen.queryByText(/rust/i)).toBeNull();
  });
});
