import { describe, it, expect, beforeEach } from "vitest";
import {
  DRAFT_KEY,
  DraftExercise,
  clearDraft,
  isDraftEmpty,
  loadDraft,
  saveDraft,
} from "@/utils/workoutDraft";
import { STORAGE_KEY_V2, type StorageLike } from "@/utils/workoutStorage";

const ex = (over: Partial<DraftExercise> = {}): DraftExercise => ({
  exercise: "Bench Press",
  sets: [
    { weight: "80", reps: "5" },
    { weight: "80", reps: "" },
  ],
  notes: "",
  isExpanded: true,
  ...over,
});

const emptyExercise = (): DraftExercise => ({
  exercise: "",
  sets: [{ weight: "", reps: "" }],
  notes: "",
  isExpanded: true,
});

beforeEach(() => localStorage.clear());

describe("isDraftEmpty", () => {
  it("een leeg formulier is geen concept", () => {
    expect(isDraftEmpty([emptyExercise()])).toBe(true);
    expect(isDraftEmpty([emptyExercise(), emptyExercise()])).toBe(true);
  });
  it("elke invoer telt: oefening, set-waarde of notitie", () => {
    expect(isDraftEmpty([ex({ exercise: "Squat", sets: [{ weight: "", reps: "" }] })])).toBe(false);
    expect(isDraftEmpty([{ ...emptyExercise(), sets: [{ weight: "50", reps: "" }] }])).toBe(false);
    expect(isDraftEmpty([{ ...emptyExercise(), sets: [{ weight: "", reps: "8" }] }])).toBe(false);
    expect(isDraftEmpty([{ ...emptyExercise(), notes: "schouder voelt raar" }])).toBe(false);
  });
  it("alleen spaties telt niet als invoer", () => {
    expect(isDraftEmpty([{ ...emptyExercise(), exercise: "   ", notes: " " }])).toBe(true);
  });
});

describe("saveDraft en loadDraft", () => {
  it("bewaart en herstelt het formulier exact, inclusief half ingevulde sets en uitgeklapte staat", () => {
    const exercises = [ex(), ex({ exercise: "Squat", isExpanded: false, notes: "diep" })];
    const now = new Date("2026-10-20T10:00:00.000Z");
    expect(saveDraft(localStorage, exercises, "Push", now)).toBe("saved");

    const draft = loadDraft(localStorage);
    expect(draft).not.toBeNull();
    expect(draft!.exercises).toEqual(exercises);
    expect(draft!.trainingType).toBe("Push");
    expect(draft!.savedAt).toBe("2026-10-20T10:00:00.000Z");
  });

  it("overschrijft het vorige concept (laatste stand wint)", () => {
    saveDraft(localStorage, [ex()], "Push");
    saveDraft(localStorage, [ex({ exercise: "Deadlift" })], "Pull");
    const draft = loadDraft(localStorage)!;
    expect(draft.exercises[0].exercise).toBe("Deadlift");
    expect(draft.trainingType).toBe("Pull");
  });

  it("een leeg formulier wist het concept", () => {
    saveDraft(localStorage, [ex()], "Push");
    expect(saveDraft(localStorage, [emptyExercise()], "Custom")).toBe("cleared");
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(loadDraft(localStorage)).toBeNull();
  });

  it("raakt de opgeslagen workouts niet aan", () => {
    localStorage.setItem(STORAGE_KEY_V2, '{"schemaVersion":2,"workouts":[]}');
    saveDraft(localStorage, [ex()], "Push");
    clearDraft(localStorage);
    expect(localStorage.getItem(STORAGE_KEY_V2)).toBe('{"schemaVersion":2,"workouts":[]}');
  });

  it("clearDraft verwijdert het concept", () => {
    saveDraft(localStorage, [ex()], "Push");
    clearDraft(localStorage);
    expect(loadDraft(localStorage)).toBeNull();
  });
});

describe("robuustheid bij ongeldige of ontbrekende opslag", () => {
  const put = (value: unknown) => localStorage.setItem(DRAFT_KEY, typeof value === "string" ? value : JSON.stringify(value));
  const valid = () => ({
    version: 1,
    savedAt: "2026-10-20T10:00:00.000Z",
    trainingType: "Push",
    exercises: [{ exercise: "Bench Press", sets: [{ weight: "80", reps: "5" }], notes: "", isExpanded: true }],
  });

  it("geeft null bij niets, kapotte JSON en verkeerde vorm", () => {
    expect(loadDraft(localStorage)).toBeNull();
    put("{ kapot");
    expect(loadDraft(localStorage)).toBeNull();
    put("[1,2,3]");
    expect(loadDraft(localStorage)).toBeNull();
    put("null");
    expect(loadDraft(localStorage)).toBeNull();
  });

  it("weigert een onbekende versie", () => {
    put({ ...valid(), version: 2 });
    expect(loadDraft(localStorage)).toBeNull();
  });

  it("weigert ongeldige oefeningen of sets, in plaats van half te herstellen", () => {
    put({ ...valid(), exercises: [] });
    expect(loadDraft(localStorage)).toBeNull();
    put({ ...valid(), exercises: [{ exercise: 5, sets: [], notes: "" }] });
    expect(loadDraft(localStorage)).toBeNull();
    put({ ...valid(), exercises: [{ exercise: "X", sets: [], notes: "" }] });
    expect(loadDraft(localStorage)).toBeNull();
    put({ ...valid(), exercises: [{ exercise: "X", sets: [{ weight: 80, reps: 5 }], notes: "" }] });
    expect(loadDraft(localStorage)).toBeNull();
  });

  it("weigert absurd veel oefeningen, maar kort een te lange notitie in zodat de sets behouden blijven", () => {
    const many = Array.from({ length: 51 }, () => valid().exercises[0]);
    put({ ...valid(), exercises: many });
    expect(loadDraft(localStorage)).toBeNull();

    put({ ...valid(), exercises: [{ ...valid().exercises[0], notes: "x".repeat(6000) }] });
    const draft = loadDraft(localStorage)!;
    expect(draft.exercises[0].notes).toHaveLength(5000);
    expect(draft.exercises[0].sets).toEqual([{ weight: "80", reps: "5" }]);
  });

  it("weigert een te lange oefeningnaam of setwaarde", () => {
    put({ ...valid(), exercises: [{ ...valid().exercises[0], exercise: "x".repeat(5001) }] });
    expect(loadDraft(localStorage)).toBeNull();
  });

  it("valt terug op Custom bij een onbekend trainingstype en op nu bij een ongeldige datum", () => {
    put({ ...valid(), trainingType: "Onbekend", savedAt: "geen datum" });
    const draft = loadDraft(localStorage)!;
    expect(draft.trainingType).toBe("Custom");
    expect(Number.isNaN(new Date(draft.savedAt).getTime())).toBe(false);
  });

  it("een concept zonder enige invoer wordt niet hersteld", () => {
    put({ ...valid(), exercises: [{ exercise: "", sets: [{ weight: "", reps: "" }], notes: "", isExpanded: true }] });
    expect(loadDraft(localStorage)).toBeNull();
  });

  it("gooit nooit een fout als de opslag ontbreekt, vol is of weigert te lezen", () => {
    expect(loadDraft(null)).toBeNull();
    expect(saveDraft(null, [ex()], "Push")).toBe("error");
    expect(() => clearDraft(null)).not.toThrow();

    const throwing: StorageLike = {
      getItem: () => {
        throw new Error("geblokkeerd");
      },
      setItem: () => {
        throw new DOMException("vol", "QuotaExceededError");
      },
      removeItem: () => {
        throw new Error("geblokkeerd");
      },
    };
    expect(loadDraft(throwing)).toBeNull();
    expect(saveDraft(throwing, [ex()], "Push")).toBe("error");
    expect(saveDraft(throwing, [emptyExercise()], "Custom")).toBe("error");
    expect(() => clearDraft(throwing)).not.toThrow();
  });
});
