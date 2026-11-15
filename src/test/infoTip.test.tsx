import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InfoTip } from "@/components/InfoTip";
import { OverviewSection } from "@/components/stats/OverviewSection";

describe("InfoTip", () => {
  it("toont de uitleg pas na een tik", async () => {
    render(<InfoTip term="Volume">Gewicht × herhalingen</InfoTip>);
    expect(screen.queryByText(/gewicht × herhalingen/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Uitleg: Volume" }));
    expect(await screen.findByText(/gewicht × herhalingen/i)).toBeTruthy();
  });
});

describe("OverviewSection", () => {
  const week = { sessions: 2, volume: 1000, sets: 6 };
  it("toont recente records met vorige en nieuwe waarde", () => {
    render(
      <OverviewSection
        weeks={{ thisWeek: week, lastWeek: { sessions: 1, volume: 500, sets: 3 } }}
        trends={[]}
        records={[
          { exerciseKey: "bench", exerciseName: "Bench Press", dateKey: "2026-11-10", workoutId: "w1", weight: 105, reps: 5, e1RM: 122.5, previousE1RM: 116.7 },
        ]}
        onSelectExercise={() => {}}
      />
    );
    expect(screen.getByText("Bench Press")).toBeTruthy();
    expect(screen.getByText("117 → 123 kg")).toBeTruthy();
    expect(screen.getByText(/te weinig data/i)).toBeTruthy();
  });

  it("zegt eerlijk dat er geen records zijn", () => {
    render(
      <OverviewSection weeks={{ thisWeek: week, lastWeek: week }} trends={[]} records={[]} onSelectExercise={() => {}} />
    );
    expect(screen.getByText(/geen nieuwe records/i)).toBeTruthy();
  });
});
