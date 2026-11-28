import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { buildSessions } from "@/utils/statistics";
import { isValidRating, ratingEmoji, ratingStats } from "@/utils/rating";
import { applyChanges } from "@/utils/workoutStorage";
import { normalizeWorkout } from "@/utils/workoutNormalization";
import { RatingSheet } from "@/components/RatingSheet";
import { RatingBadge } from "@/components/RatingBadge";
import { RatingSection } from "@/components/stats/RatingSection";
import type { Workout } from "@/types/workout";
import { makeExercise, makeWorkout } from "./factories";

const BRU = "Europe/Brussels";
const rated = (id: string, iso: string, rating?: number) =>
  makeWorkout({ id, startedAt: iso, timeZone: BRU, exercises: [makeExercise("Bench Press", [[100, 5]])], ...(rating ? { rating } : {}) });

describe("rating model", () => {
  it("valideert alleen gehele getallen 1-10", () => {
    expect([1, 10, 7].every(isValidRating)).toBe(true);
    expect([0, 11, 5.5, "7", null, undefined].some(isValidRating)).toBe(false);
  });

  it("normalisatie houdt een geldige rating en gooit ongeldige weg", () => {
    const base = rated("a", "2026-11-10T10:00:00.000Z", 8);
    expect(normalizeWorkout(base as unknown).workout?.rating).toBe(8);
    expect(normalizeWorkout({ ...base, rating: 99 }).workout?.rating).toBeUndefined();
  });

  it("applyChanges zet en wist de rating zonder de rest te raken", () => {
    const base = rated("a", "2026-11-10T10:00:00.000Z") as unknown as Workout;
    const withRating = applyChanges(base, { rating: 6 });
    expect(withRating.rating).toBe(6);
    expect(withRating.exercises).toEqual(base.exercises);
    expect(applyChanges(withRating, { rating: null }).rating).toBeUndefined();
  });
});

describe("ratingStats", () => {
  const { sessions } = buildSessions([
    rated("1", "2026-11-10T10:00:00.000Z", 8),
    rated("2", "2026-11-12T10:00:00.000Z", 6),
    rated("3", "2026-11-03T10:00:00.000Z", 4),
    rated("4", "2026-11-04T10:00:00.000Z"),
  ]);

  it("middelt per week en telt alleen beoordeelde trainingen", () => {
    const r = ratingStats(sessions, "2026-11-15");
    expect(r.thisWeekAvg).toBe(7);
    expect(r.lastWeekAvg).toBe(4);
    expect(r.rated).toBe(3);
    expect(r.points.map((p) => p.rating)).toEqual([4, 8, 6]);
  });

  it("geeft null zonder beoordelingen in een week", () => {
    expect(ratingStats(sessions, "2026-11-29").thisWeekAvg).toBeNull();
  });
});

describe("rating UI", () => {
  it("RatingSheet: schuif toont smiley en slaat de gekozen waarde op", () => {
    const onSave = vi.fn();
    render(<RatingSheet open onSave={onSave} onSkip={() => {}} />);
    expect(screen.getByTestId("rating-preview")).toHaveTextContent(ratingEmoji(7));
    fireEvent.click(screen.getByRole("button", { name: /opslaan/i }));
    expect(onSave).toHaveBeenCalledWith(7);
  });

  it("RatingSheet: overslaan kan altijd", () => {
    const onSkip = vi.fn();
    render(<RatingSheet open onSave={() => {}} onSkip={onSkip} />);
    fireEvent.click(screen.getByRole("button", { name: /overslaan/i }));
    expect(onSkip).toHaveBeenCalled();
  });

  it("RatingBadge verbergt zich zonder rating", () => {
    const { container, rerender } = render(<RatingBadge rating={undefined} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<RatingBadge rating={9} />);
    expect(screen.getByLabelText(/9/)).toBeInTheDocument();
  });

  it("RatingSection verschijnt pas met beoordelingen", () => {
    const empty = ratingStats([], "2026-11-15");
    const { container } = render(<RatingSection stats={empty} />);
    expect(container).toBeEmptyDOMElement();
  });
});
