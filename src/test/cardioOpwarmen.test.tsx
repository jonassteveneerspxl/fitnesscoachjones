import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkoutForm } from "@/components/WorkoutForm";
import { makeExercise, makeWorkout } from "./factories";

vi.mock("@/components/ExerciseSelector", () => ({
  ExerciseSelector: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input aria-label="Oefening" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock("@/components/ui/select", async () => await import("./nativeSelectMock"));

const warm = { exercise: "Wandelen", kind: "cardio" as const, cardio: { activity: "Wandelen", distanceKm: 0.8, durationSeconds: 600 }, sets: [], volume: 0, estimated1RM: 0 };
const lastPush = makeWorkout({ id: "p", trainingType: "Push", startedAt: "2026-11-10T10:00:00.000Z", exercises: [warm, makeExercise("Bench Press", [[80, 5]])] });
const type = (v: string) => fireEvent.change(screen.getByLabelText("Trainingstype"), { target: { value: v } });
const save = () => fireEvent.click(screen.getByRole("button", { name: /training opslaan/i }));

describe("opwarmcardio van vorige keer", () => {
  beforeEach(() => localStorage.clear());

  it("trainingstype kiezen zet de opwarming van vorige keer klaar als voorstel", () => {
    render(<WorkoutForm onSubmit={vi.fn()} history={[lastPush]} />);
    type("Push");
    expect(screen.getByText(/zoals vorige keer/i)).toBeTruthy();
    expect((screen.getByLabelText("Soort") as HTMLSelectElement).value).toBe("Wandelen");
    expect((screen.getByLabelText("Tijd") as HTMLInputElement).value).toBe("10:00");
    expect((screen.getByLabelText(/afstand/i) as HTMLInputElement).value).toBe("0.8");
  });

  it("een voorstel wordt niet opgeslagen zolang je het niet bevestigt", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<WorkoutForm onSubmit={onSubmit} history={[lastPush]} />);
    type("Push");
    fireEvent.change(screen.getByLabelText("Oefening"), { target: { value: "Bench Press" } });
    fireEvent.change(screen.getByPlaceholderText("Gewicht"), { target: { value: "80" } });
    fireEvent.change(screen.getByPlaceholderText("Reps"), { target: { value: "6" } });
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].map((e: { exercise: string }) => e.exercise)).toEqual(["Bench Press"]);
  });

  it("'Gedaan' bevestigt de opwarming, die dan vóór de krachtoefeningen wordt opgeslagen", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<WorkoutForm onSubmit={onSubmit} history={[lastPush]} />);
    type("Push");
    fireEvent.click(screen.getByRole("button", { name: "Gedaan" }));
    expect(screen.queryByText(/zoals vorige keer/i)).toBeNull();
    fireEvent.change(screen.getByLabelText("Oefening"), { target: { value: "Bench Press" } });
    fireEvent.change(screen.getByPlaceholderText("Gewicht"), { target: { value: "80" } });
    fireEvent.change(screen.getByPlaceholderText("Reps"), { target: { value: "6" } });
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const [exercises] = onSubmit.mock.calls[0];
    expect(exercises.map((e: { exercise: string }) => e.exercise)).toEqual(["Wandelen", "Bench Press"]);
    expect(exercises[0].cardio).toEqual({ activity: "Wandelen", distanceKm: 0.8, durationSeconds: 600 });
  });

  it("de tijd aanpassen telt als bevestigen, met de nieuwe waarde", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<WorkoutForm onSubmit={onSubmit} history={[lastPush]} />);
    type("Push");
    fireEvent.change(screen.getByLabelText("Tijd"), { target: { value: "15" } });
    expect(screen.queryByText(/zoals vorige keer/i)).toBeNull();
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0][0].cardio.durationSeconds).toBe(900);
  });

  it("zonder cardio vorige keer komt er geen voorstel, en een ander type neemt het voorstel niet mee", () => {
    render(<WorkoutForm onSubmit={vi.fn()} history={[lastPush]} />);
    type("Pull");
    expect(screen.queryByText(/zoals vorige keer/i)).toBeNull();
    type("Push");
    expect(screen.getByText(/zoals vorige keer/i)).toBeTruthy();
    type("Pull");
    expect(screen.queryByText(/zoals vorige keer/i)).toBeNull();
  });

  it("snelstart 'Zelfde als vorige' zet ook de opwarming klaar en blijft beschikbaar", () => {
    render(<WorkoutForm onSubmit={vi.fn()} history={[lastPush]} />);
    type("Push");
    fireEvent.click(screen.getByRole("button", { name: /zelfde als vorige/i }));
    expect(screen.getByText(/zoals vorige keer/i)).toBeTruthy();
  });

  it("de knop bovenaan voegt cardio vooraan toe", () => {
    render(<WorkoutForm onSubmit={vi.fn()} />);
    type("Push");
    fireEvent.click(screen.getByRole("button", { name: /cardio \/ opwarmen toevoegen/i }));
    expect(screen.getByLabelText(/afstand/i)).toBeTruthy();
  });
});
