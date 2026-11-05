import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { buildMonthGrid, summarizeMonth } from "@/utils/calendar";
import { buildSessions } from "@/utils/statistics";
import { makeExercise, makeWorkout } from "./factories";
import type { Workout } from "@/types/workout";

// Echte trainingsdata van Jonas (alleen de datums en types), in de tijdzone waarin ze zijn opgeslagen.
const at = (id: string, startedAt: string, trainingType: Workout["trainingType"], timeZone = "Europe/Brussels") =>
  makeWorkout({ id, startedAt, date: startedAt, trainingType, timeZone, exercises: [makeExercise("Squat", [[60, 5]])] });
const workouts: Workout[] = [
  at("a", "2026-10-20T19:45:24.918Z", "Pull"),
  at("b", "2026-10-24T14:22:28.337Z", "Push"),
  at("c", "2026-10-26T10:59:34.697Z", "Pull"),
  at("d", "2026-10-27T15:40:13.405Z", "Push"),
  at("e", "2026-10-28T14:40:41.791Z", "Legs"),
  at("f", "2026-10-30T15:33:22.039Z", "Push"),
  at("g", "2026-10-31T20:36:16.201Z", "Pull"),
];
const sessions = buildSessions(workouts).sessions;

vi.mock("@/hooks/useWorkoutLogs", () => ({
  useWorkoutLogs: () => ({ workouts: mockWorkouts, isLoading: false, storageInfo: { status: "ok", warnings: [], readOnly: false } }),
}));
let mockWorkouts: Workout[] = workouts;

describe("buildMonthGrid", () => {
  it("geeft volledige weken die met maandag beginnen en markeert trainingsdagen", () => {
    const weeks = buildMonthGrid("2026-10", sessions, "2026-11-02");
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0][0].dateKey).toBe("2026-09-28"); // 1 okt 2026 is een donderdag
    expect(weeks[0][0].inMonth).toBe(false);
    expect(weeks.at(-1)!.at(-1)!.dateKey).toBe("2026-11-01");
    const trained = weeks.flat().filter((d) => d.sessions.length > 0).map((d) => d.dateKey);
    expect(trained).toEqual(["2026-10-20", "2026-10-24", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-30", "2026-10-31"]);
  });

  it("markeert vandaag en toekomstige dagen", () => {
    const days = buildMonthGrid("2026-11", sessions, "2026-11-02").flat();
    expect(days.find((d) => d.dateKey === "2026-11-02")!.isToday).toBe(true);
    expect(days.find((d) => d.dateKey === "2026-11-03")!.isFuture).toBe(true);
    expect(days.find((d) => d.dateKey === "2026-11-01")!.isFuture).toBe(false);
  });

  it("zet een late avondtraining op de juiste lokale dag, en twee trainingen op één dag samen", () => {
    const late = at("late", "2026-10-31T23:30:00.000Z", "Legs"); // 1 nov 00:30 in Brussel
    const early = at("early", "2026-11-05T06:00:00.000Z", "Push");
    const twice = at("twice", "2026-11-05T17:00:00.000Z", "Pull");
    const s = buildSessions([late, early, twice]).sessions;
    const days = buildMonthGrid("2026-11", s, "2026-11-30").flat();
    expect(days.find((d) => d.dateKey === "2026-11-01")!.sessions.map((x) => x.workoutId)).toEqual(["late"]);
    expect(days.find((d) => d.dateKey === "2026-11-05")!.sessions.map((x) => x.workoutId)).toEqual(["early", "twice"]);
  });

  it("februari in een schrikkeljaar en een maand die op maandag begint", () => {
    expect(buildMonthGrid("2028-02", [], "2028-03-01").flat().filter((d) => d.inMonth)).toHaveLength(29);
    const weeks = buildMonthGrid("2026-06", [], "2026-07-01"); // 1 juni 2026 = maandag, 30 dagen, eindigt dinsdag
    expect(weeks[0][0].dateKey).toBe("2026-06-01");
    expect(weeks.at(-1)!.at(-1)!.dateKey).toBe("2026-07-05");
  });
});

describe("summarizeMonth", () => {
  it("telt trainingsdagen, trainingen en rustdagen tot vandaag", () => {
    expect(summarizeMonth("2026-10", sessions, "2026-11-02")).toEqual({ sessionCount: 7, trainingDays: 7, restDays: 24 });
    // Midden in de maand tellen toekomstige dagen niet als gemist.
    const untilThe24th = sessions.filter((x) => x.dateKey <= "2026-10-24");
    expect(summarizeMonth("2026-10", untilThe24th, "2026-10-25")).toEqual({ sessionCount: 2, trainingDays: 2, restDays: 23 });
  });

  it("een maand in de toekomst heeft nog geen rustdagen; de huidige maand telt tot en met vandaag", () => {
    expect(summarizeMonth("2026-12", sessions, "2026-11-02").restDays).toBe(0);
    expect(summarizeMonth("2026-11", sessions, "2026-11-02")).toEqual({ sessionCount: 0, trainingDays: 0, restDays: 2 });
  });

  it("twee trainingen op één dag tellen als twee trainingen maar één trainingsdag", () => {
    const s = buildSessions([at("x", "2026-11-05T06:00:00.000Z", "Push"), at("y", "2026-11-05T17:00:00.000Z", "Pull")]).sessions;
    expect(summarizeMonth("2026-11", s, "2026-11-10")).toEqual({ sessionCount: 2, trainingDays: 1, restDays: 9 });
  });
});

describe("Kalender-pagina", () => {
  const renderPage = async (today = "2026-11-02") => {
    const { default: CalendarPage } = await import("@/pages/Calendar");
    return render(
      <MemoryRouter>
        <CalendarPage today={today} />
      </MemoryRouter>
    );
  };

  it("toont de huidige maand met aantallen; vorige maand toont oktober met vinkjes", async () => {
    mockWorkouts = workouts;
    await renderPage();
    expect(screen.getByRole("heading", { level: 2 }).textContent?.toLowerCase()).toContain("november");
    expect(within(screen.getByTestId("month-summary")).getByText("rustdagen").previousElementSibling!.textContent).toBe("2");
    expect(screen.getByRole("button", { name: "Volgende maand" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Vorige maand" }));
    expect(screen.getByRole("heading", { level: 2 }).textContent?.toLowerCase()).toContain("oktober");
    expect(screen.getByTestId("day-2026-10-28").getAttribute("data-trained")).toBe("true");
    expect(screen.getByTestId("day-2026-10-29").getAttribute("data-trained")).toBe("false");
    expect(within(screen.getByTestId("month-summary")).getByText("trainingsdagen").previousElementSibling!.textContent).toBe("7");
  });

  it("tikken op een trainingsdag toont de workout, op een rustdag een rustdagmelding", async () => {
    mockWorkouts = workouts;
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Vorige maand" }));
    fireEvent.click(screen.getByTestId("day-2026-10-29"));
    expect(screen.getByText(/rustdag: geen training gelogd/i)).toBeTruthy();
    fireEvent.click(screen.getByTestId("day-2026-10-28"));
    expect(screen.queryByText(/rustdag: geen training/i)).toBeNull();
    expect(screen.getAllByText(/legs/i).length).toBeGreaterThan(1); // in de cel én in de geopende workout
  });

  it("zonder workouts blijft de kalender leeg maar werkt hij", async () => {
    mockWorkouts = [];
    await renderPage();
    expect(screen.getByTestId("day-2026-11-01").getAttribute("data-trained")).toBe("false");
  });

  it("toekomstige dagen zijn niet te selecteren", async () => {
    mockWorkouts = workouts;
    await renderPage("2026-11-02");
    expect(screen.getByTestId("day-2026-11-03").hasAttribute("disabled")).toBe(true);
  });
});
