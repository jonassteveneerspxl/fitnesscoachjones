import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkoutForm } from "@/components/WorkoutForm";

vi.mock("@/components/ExerciseSelector", () => ({
  ExerciseSelector: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input aria-label="Oefening" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock("@/components/ui/select", async () => await import("./nativeSelectMock"));

const chooseCardio = () => fireEvent.change(screen.getByLabelText("Trainingstype"), { target: { value: "Cardio" } });
const save = () => fireEvent.click(screen.getByRole("button", { name: /training opslaan/i }));

describe("tijdoefeningen en cardio in het formulier", () => {
  beforeEach(() => localStorage.clear());

  it("slaat cardio op met soort, afstand en tijd, en toont het tempo", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<WorkoutForm onSubmit={onSubmit} />);
    chooseCardio();
    fireEvent.change(screen.getByLabelText(/afstand/i), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Tijd"), { target: { value: "50:00" } });
    expect(screen.getByTestId("cardio-pace").textContent).toMatch(/5:00\/km/);
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const [exercises] = onSubmit.mock.calls[0];
    expect(exercises).toHaveLength(1);
    expect(exercises[0]).toMatchObject({
      exercise: "Lopen",
      kind: "cardio",
      cardio: { activity: "Lopen", distanceKm: 10, durationSeconds: 3000 },
      sets: [],
    });
  });

  it("een plank wordt automatisch een tijdoefening, met optioneel gewicht", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<WorkoutForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("Oefening"), { target: { value: "Plank" } });
    fireEvent.change(screen.getByLabelText("Tijd set 1"), { target: { value: "1:00" } });
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const [exercises] = onSubmit.mock.calls[0];
    expect(exercises[0]).toMatchObject({ exercise: "Plank", kind: "time", sets: [{ setNumber: 1, weight: 0, reps: 0, durationSeconds: 60 }] });
    expect(exercises[0].volume).toBe(0);
  });

  it("trainingstype Cardio geeft meteen een cardioblok, zonder oefening te kiezen of soort te schakelen", () => {
    render(<WorkoutForm onSubmit={vi.fn()} />);
    expect(screen.queryByLabelText("Oefening")).not.toBeNull();
    chooseCardio();
    expect(screen.queryByLabelText("Oefening")).toBeNull();
    expect(screen.getByLabelText(/afstand/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^(kracht|tijd)$/i })).toBeNull();
    expect(screen.getByRole("button", { name: /cardio toevoegen/i })).toBeTruthy();
  });

  it("een leeg cardioblok verdwijnt weer als je het type terug wijzigt", () => {
    render(<WorkoutForm onSubmit={vi.fn()} />);
    chooseCardio();
    fireEvent.change(screen.getByLabelText("Trainingstype"), { target: { value: "Push" } });
    expect(screen.queryByLabelText(/afstand/i)).toBeNull();
    expect(screen.queryByLabelText("Oefening")).not.toBeNull();
  });

  it("cardio als warming-up in een krachttraining kan via 'Cardio toevoegen'", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<WorkoutForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("Trainingstype"), { target: { value: "Push" } });
    fireEvent.change(screen.getByLabelText("Oefening"), { target: { value: "Bench Press" } });
    fireEvent.change(screen.getByPlaceholderText("Gewicht"), { target: { value: "60" } });
    fireEvent.change(screen.getByPlaceholderText("Reps"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: /cardio toevoegen/i }));
    fireEvent.change(screen.getByLabelText(/afstand/i), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Tijd"), { target: { value: "10" } });
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const [exercises] = onSubmit.mock.calls[0];
    expect(exercises.map((e: { exercise: string }) => e.exercise)).toEqual(["Bench Press", "Lopen"]);
  });

  it("cardio als eerste (warming-up) vervangt de lege oefening en komt vóór de krachtoefeningen", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<WorkoutForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("Trainingstype"), { target: { value: "Push" } });
    fireEvent.click(screen.getByRole("button", { name: /cardio toevoegen/i }));
    fireEvent.change(screen.getByLabelText(/afstand/i), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Tijd"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /^oefening toevoegen$/i }));
    fireEvent.change(screen.getByLabelText("Oefening"), { target: { value: "Bench Press" } });
    fireEvent.change(screen.getByPlaceholderText("Gewicht"), { target: { value: "60" } });
    fireEvent.change(screen.getByPlaceholderText("Reps"), { target: { value: "5" } });
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].map((e: { exercise: string }) => e.exercise)).toEqual(["Lopen", "Bench Press"]);
  });

  it("alleen houd-oefeningen krijgen tijdinvoer; Bench Press blijft gewicht × reps", () => {
    render(<WorkoutForm onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Oefening"), { target: { value: "L-sit" } });
    expect(screen.getByLabelText("Tijd set 1")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Oefening"), { target: { value: "Bench Press" } });
    expect(screen.queryByLabelText("Tijd set 1")).toBeNull();
  });

  it("slaat niets op bij cardio met afstand maar zonder tijd", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<WorkoutForm onSubmit={onSubmit} />);
    chooseCardio();
    fireEvent.change(screen.getByLabelText(/afstand/i), { target: { value: "5" } });
    save();
    await new Promise((r) => setTimeout(r, 30));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("cardio gaat niet verloren bij herladen: het concept bewaart soort, afstand en tijd", () => {
    const first = render(<WorkoutForm onSubmit={vi.fn()} />);
    chooseCardio();
    fireEvent.change(screen.getByLabelText(/afstand/i), { target: { value: "7,5" } });
    fireEvent.change(screen.getByLabelText("Tijd"), { target: { value: "40" } });
    first.unmount();
    render(<WorkoutForm onSubmit={vi.fn()} />);
    expect((screen.getByLabelText(/afstand/i) as HTMLInputElement).value).toBe("7,5");
    expect((screen.getByLabelText("Tijd") as HTMLInputElement).value).toBe("40");
  });
});
