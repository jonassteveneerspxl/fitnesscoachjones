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

describe("OverviewSection cardio en tijd", () => {
  const w = { sessions: 1, volume: 0, sets: 0 };
  it("toont cardio van de week en de voortgang van een tijdoefening", () => {
    render(
      <OverviewSection
        weeks={{ thisWeek: w, lastWeek: w }}
        trends={[]}
        records={[]}
        cardio={{ thisWeek: { count: 2, km: 15, seconds: 4500 }, lastWeek: { count: 0, km: 0, seconds: 0 } }}
        timed={[{ exerciseKey: "plank", exerciseName: "Plank", lastSeconds: 75, lastWeight: 0, lastDateKey: "2026-11-10", previousSeconds: 60, sessions: 2 }]}
        onSelectExercise={() => {}}
      />
    );
    expect(screen.getByTestId("cardio-week").textContent).toMatch(/15 km/);
    expect(screen.getByTestId("cardio-week").textContent).toMatch(/1:15:00/);
    expect(screen.getByTestId("timed-progress").textContent).toMatch(/1:15/);
    expect(screen.getByTestId("timed-progress").textContent).toMatch(/\+0:15/);
  });

  it("toont geen cardio- of tijdblok zonder data", () => {
    render(<OverviewSection weeks={{ thisWeek: w, lastWeek: w }} trends={[]} records={[]} onSelectExercise={() => {}} />);
    expect(screen.queryByTestId("cardio-week")).toBeNull();
    expect(screen.queryByTestId("timed-progress")).toBeNull();
  });
});
