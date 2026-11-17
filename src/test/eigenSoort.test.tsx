import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { cardioActivities, mergeCatalog, parseCustomExercise, validateNewExercise } from "@/utils/customExercises";
import { ExerciseCatalogProvider, ExerciseStore } from "@/context/ExerciseCatalogContext";
import { WorkoutForm } from "@/components/WorkoutForm";
import { normalizeWorkout } from "@/utils/workoutNormalization";
import { exercises as builtIn } from "@/data/exercises";

vi.mock("@/components/ExerciseSelector", () => ({
  ExerciseSelector: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input aria-label="Oefening" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock("@/components/ui/select", async () => await import("./nativeSelectMock"));

describe("soort van eigen oefeningen: validatie en lezen", () => {
  it("een cardio-oefening heeft geen spiergroep nodig; een krachtoefening wel", () => {
    expect(validateNewExercise({ name: "Crosstrainer", kind: "cardio", muscleGroup: "" }, builtIn).ok).toBe(true);
    expect(validateNewExercise({ name: "Mijn curl", muscleGroup: "" }, builtIn).message).toMatch(/spiergroep/i);
    expect(validateNewExercise({ name: "Mijn curl", kind: "strength", muscleGroup: "" }, builtIn).ok).toBe(false);
  });

  it("bewaart het soort alleen bij tijd en cardio; kracht blijft zonder kind (zoals eerder)", () => {
    expect(validateNewExercise({ name: "Copenhagen plank", kind: "time", muscleGroup: "core" }, builtIn).value).toMatchObject({ kind: "time", muscleGroup: "core" });
    expect(validateNewExercise({ name: "Mijn curl", kind: "strength", muscleGroup: "biceps" }, builtIn).value).not.toHaveProperty("kind");
    expect(validateNewExercise({ name: "Mijn curl", kind: "onzin", muscleGroup: "biceps" }, builtIn).value).not.toHaveProperty("kind");
  });

  it("leest oude documenten zonder kind als krachtoefening, en cardio zonder spiergroep", () => {
    expect(parseCustomExercise("a", { name: "Fly machine", muscleGroup: "chest", pplCategory: "push", createdAt: "x" })?.kind).toBeUndefined();
    expect(parseCustomExercise("b", { name: "Crosstrainer", kind: "cardio", createdAt: "x" })?.kind).toBe("cardio");
    expect(parseCustomExercise("c", { name: "Iets", createdAt: "x" })).toBeNull(); // kracht zonder spiergroep blijft ongeldig
  });

  it("cardio staat niet in de krachtlijst maar wel bij de cardiosoorten", () => {
    const cardio = parseCustomExercise("b", { name: "Crosstrainer", kind: "cardio", createdAt: "x" })!;
    expect(mergeCatalog([cardio]).some((e) => e.name === "Crosstrainer")).toBe(false);
    expect(cardioActivities([cardio], ["Lopen"])).toEqual(["Lopen", "Crosstrainer"]);
  });

  it("een eigen cardiosoort blijft bewaard in een training", () => {
    const { workout } = normalizeWorkout({
      id: "w", userId: "u", date: "2026-11-10T10:00:00.000Z", startedAt: "2026-11-10T10:00:00.000Z", timeZone: "Europe/Brussels", trainingType: "Cardio",
      exercises: [{ exercise: "Crosstrainer", kind: "cardio", cardio: { activity: "Crosstrainer", distanceKm: 5, durationSeconds: 1200 } }],
    });
    expect(workout!.exercises[0].cardio?.activity).toBe("Crosstrainer");
  });
});

function fakeStore(docs: { id: string; data: Record<string, unknown> }[]): ExerciseStore {
  return { listen: (onData) => { onData(docs); return () => undefined; }, put: async () => undefined, remove: async () => undefined };
}

describe("soort van eigen oefeningen in het formulier", () => {
  const store = fakeStore([
    { id: "1", data: { name: "Copenhagen plank", kind: "time", muscleGroup: "core", pplCategory: "pull", createdAt: "x" } },
    { id: "2", data: { name: "Crosstrainer", kind: "cardio", createdAt: "x" } },
  ]);
  const renderForm = (onSubmit = vi.fn().mockResolvedValue(true)) => {
    localStorage.clear();
    render(<ExerciseCatalogProvider store={store}><WorkoutForm onSubmit={onSubmit} /></ExerciseCatalogProvider>);
    return onSubmit;
  };

  it("een eigen houd-oefening krijgt tijdinvoer", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Oefening"), { target: { value: "Copenhagen plank" } });
    await waitFor(() => expect(screen.getByLabelText("Tijd set 1")).toBeTruthy());
  });

  it("de eigen cardiosoort staat in het cardioblok en wordt opgeslagen", async () => {
    const onSubmit = renderForm();
    fireEvent.change(screen.getByLabelText("Trainingstype"), { target: { value: "Cardio" } });
    fireEvent.change(screen.getByLabelText("Soort"), { target: { value: "Crosstrainer" } });
    fireEvent.change(screen.getByLabelText(/afstand/i), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Tijd"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: /training opslaan/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0][0]).toMatchObject({ exercise: "Crosstrainer", kind: "cardio", cardio: { activity: "Crosstrainer", distanceKm: 5, durationSeconds: 1200 } });
  });

  it("een eigen cardio-oefening gekozen in de oefeninglijst wordt een cardioblok", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Oefening"), { target: { value: "Crosstrainer" } });
    await waitFor(() => expect(screen.getByLabelText(/afstand/i)).toBeTruthy());
    expect((screen.getByLabelText("Soort") as HTMLSelectElement).value).toBe("Crosstrainer");
  });
});
