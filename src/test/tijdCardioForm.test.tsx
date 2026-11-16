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

const save = () => fireEvent.click(screen.getByRole("button", { name: /training opslaan/i }));

describe("tijdoefeningen en cardio in het formulier", () => {
  beforeEach(() => localStorage.clear());

  it("slaat cardio op met soort, afstand en tijd, en toont het tempo", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<WorkoutForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Cardio" }));
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

  it("slaat niets op bij cardio met afstand maar zonder tijd", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<WorkoutForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Cardio" }));
    fireEvent.change(screen.getByLabelText(/afstand/i), { target: { value: "5" } });
    save();
    await new Promise((r) => setTimeout(r, 30));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("cardio gaat niet verloren bij herladen: het concept bewaart soort, afstand en tijd", () => {
    const first = render(<WorkoutForm onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Cardio" }));
    fireEvent.change(screen.getByLabelText(/afstand/i), { target: { value: "7,5" } });
    fireEvent.change(screen.getByLabelText("Tijd"), { target: { value: "40" } });
    first.unmount();
    render(<WorkoutForm onSubmit={vi.fn()} />);
    expect((screen.getByLabelText(/afstand/i) as HTMLInputElement).value).toBe("7,5");
    expect((screen.getByLabelText("Tijd") as HTMLInputElement).value).toBe("40");
  });
});
