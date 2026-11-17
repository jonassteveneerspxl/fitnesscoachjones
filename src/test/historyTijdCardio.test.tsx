import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WorkoutHistory } from "@/components/WorkoutHistory";
import { describeNonStrength } from "@/utils/cardio";
import { makeExercise, makeWorkout } from "./factories";

const cardio = { exercise: "Lopen", kind: "cardio" as const, cardio: { activity: "Lopen" as const, distanceKm: 10, durationSeconds: 3000 }, sets: [], volume: 0, estimated1RM: 0 };
const plank = { exercise: "Plank", kind: "time" as const, sets: [{ setNumber: 1, weight: 0, reps: 0, durationSeconds: 60 }, { setNumber: 2, weight: 10, reps: 0, durationSeconds: 45 }], volume: 0, estimated1RM: 0 };

describe("historiek met tijd en cardio", () => {
  it("toont afstand, tijd en tempo, en tijdsets met extra gewicht, zonder 1RM of volume", () => {
    render(<WorkoutHistory workouts={[makeWorkout({ id: "h", trainingType: "Cardio", exercises: [cardio, plank, makeExercise("Bench Press", [[80, 5]])] })]} />);
    fireEvent.click(screen.getByText("totaal volume"));
    expect(screen.getByText("10 km · 50:00 · 5:00/km")).toBeTruthy();
    expect(screen.getByText("1:00")).toBeTruthy();
    expect(screen.getByText("0:45 + 10 kg")).toBeTruthy();
    expect(screen.getByText("80kg × 5")).toBeTruthy();
    expect(screen.getAllByText(/1RM:/)).toHaveLength(1); // alleen de krachtoefening
  });

  it("krachtoefeningen blijven ongewijzigd", () => {
    expect(describeNonStrength(makeExercise("Bench Press", [[80, 5]]))).toBeNull();
  });
});
