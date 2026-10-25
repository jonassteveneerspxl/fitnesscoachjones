import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { RestTimer, formatRest } from "@/components/RestTimer";
import { WorkoutForm } from "@/components/WorkoutForm";
import { makeExercise, makeWorkout } from "./factories";

vi.mock("@/components/ExerciseSelector", () => ({
  ExerciseSelector: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input aria-label="Oefening" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock("@/components/ui/select", async () => await import("./nativeSelectMock"));

describe("formatRest", () => {
  it("toont minuten en seconden en rondt omhoog", () => {
    expect(formatRest(90)).toBe("1:30");
    expect(formatRest(59.2)).toBe("1:00");
    expect(formatRest(5)).toBe("0:05");
    expect(formatRest(-3)).toBe("0:00");
  });
});

describe("RestTimer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("telt af, past aan met ±30 seconden en meldt als de rust voorbij is", () => {
    let end = Date.now() + 90_000;
    const onChange = vi.fn((e: number) => (end = e));
    const { rerender } = render(<RestTimer endsAt={end} onChange={onChange} onClose={vi.fn()} />);
    expect(screen.getByTestId("rest-time").textContent).toBe("1:30");
    act(() => void vi.advanceTimersByTime(30_000));
    expect(screen.getByTestId("rest-time").textContent).toBe("1:00");
    fireEvent.click(screen.getByRole("button", { name: /30 seconden langer/i }));
    expect(onChange).toHaveBeenLastCalledWith(end);
    rerender(<RestTimer endsAt={end} onChange={onChange} onClose={vi.fn()} />);
    expect(screen.getByTestId("rest-time").textContent).toBe("1:30");
    act(() => void vi.advanceTimersByTime(95_000));
    expect(screen.getByTestId("rest-time").textContent).toBe("Volgende set!");
  });

  it("sluiten roept onClose aan", () => {
    const onClose = vi.fn();
    render(<RestTimer endsAt={Date.now() + 10_000} onChange={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /rusttimer sluiten/i }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("rusttimer in het formulier", () => {
  const history = [makeWorkout({ id: "b", startedAt: "2026-10-13T10:00:00.000Z", exercises: [makeExercise("Skull Crushers", [[40, 10], [40, 9]])] })];
  beforeEach(() => localStorage.clear());

  it("start na het afvinken van een set, niet bij gewoon typen", () => {
    render(<WorkoutForm onSubmit={vi.fn()} history={history} />);
    fireEvent.change(screen.getByLabelText("Oefening"), { target: { value: "Skull Crushers" } });
    fireEvent.change(screen.getAllByPlaceholderText("Reps")[0], { target: { value: "11" } });
    expect(screen.queryByRole("timer")).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: /set 2 afvinken/i }));
    expect(screen.getByRole("timer")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /rusttimer sluiten/i }));
    expect(screen.queryByRole("timer")).toBeNull();
  });

  it("start niet in bewerkmodus", () => {
    render(<WorkoutForm onSubmit={vi.fn()} initialWorkout={history[0]} />);
    expect(screen.queryByRole("timer")).toBeNull();
  });
});
