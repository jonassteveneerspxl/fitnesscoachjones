import { describe, it, expect } from "vitest";
import {
  toDateKey,
  toIsoWeekKey,
  toMonthKey,
  isoWeekStartDateKey,
  enumerateWeekKeys,
  enumerateMonthKeys,
  isValidTimeZone,
  parseInstant,
  formatDayLabel,
  formatTimeLabel,
} from "@/utils/dates";
import { normalizeExerciseName, isSameExercise } from "@/utils/exerciseNames";
import { generateId } from "@/utils/ids";

describe("toDateKey: kalenderdag hangt af van de opgegeven tijdzone, niet van het toestel", () => {
  const instant = new Date("2026-03-10T23:30:00.000Z");
  it("zelfde instant, andere dag per tijdzone", () => {
    expect(toDateKey(instant, "UTC")).toBe("2026-03-10");
    expect(toDateKey(instant, "Europe/Brussels")).toBe("2026-03-11"); // 00:30 (CET)
    expect(toDateKey(instant, "America/Los_Angeles")).toBe("2026-03-10"); // 16:30
    expect(toDateKey(instant, "Pacific/Auckland")).toBe("2026-03-11");
  });
  it("een training van 23:30 lokale tijd blijft op die dag, ook als het toestel elders staat", () => {
    // 23:30 in Brussel op 10 maart (CET, UTC+1) = 22:30Z
    const workout = new Date("2026-03-10T22:30:00.000Z");
    expect(toDateKey(workout, "Europe/Brussels")).toBe("2026-03-10");
    expect(formatTimeLabel(workout, "Europe/Brussels")).toBe("23:30");
    expect(formatDayLabel(workout, "Europe/Brussels")).toContain("10 maart");
  });
  it("houdt rekening met zomertijd", () => {
    expect(toDateKey(new Date("2026-07-01T22:30:00.000Z"), "Europe/Brussels")).toBe("2026-07-02");
    expect(toDateKey(new Date("2026-03-28T23:30:00.000Z"), "Europe/Brussels")).toBe("2026-03-29");
  });
});

describe("ISO-weken (maandag = eerste dag)", () => {
  it.each([
    ["2026-01-01", "2026-W01"], // donderdag
    ["2025-12-29", "2026-W01"], // maandag, hoort bij week 1 van 2026
    ["2026-01-04", "2026-W01"], // zondag
    ["2026-01-05", "2026-W02"],
    ["2027-01-03", "2026-W53"], // zondag: laatste dag van ISO-jaar 2026
    ["2024-12-30", "2025-W01"],
    ["2026-03-10", "2026-W11"],
    ["2026-12-31", "2026-W53"],
  ])("%s → %s", (day, week) => {
    expect(toIsoWeekKey(day)).toBe(week);
  });

  it("isoWeekStartDateKey geeft de maandag", () => {
    expect(isoWeekStartDateKey("2026-W01")).toBe("2025-12-29");
    expect(isoWeekStartDateKey("2026-W11")).toBe("2026-03-09");
    expect(toIsoWeekKey(isoWeekStartDateKey("2026-W53"))).toBe("2026-W53");
  });

  it("enumerateWeekKeys vult weken zonder training op, over jaarwisseling heen", () => {
    expect(enumerateWeekKeys("2026-W51", "2026-W53")).toEqual(["2026-W51", "2026-W52", "2026-W53"]);
    expect(enumerateWeekKeys("2026-W53", "2027-W02")).toEqual(["2026-W53", "2027-W01", "2027-W02"]);
  });
});

describe("maanden", () => {
  it("toMonthKey en enumerateMonthKeys", () => {
    expect(toMonthKey("2026-03-10")).toBe("2026-03");
    expect(enumerateMonthKeys("2025-11", "2026-02")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});

describe("validatie", () => {
  it("isValidTimeZone", () => {
    expect(isValidTimeZone("Europe/Brussels")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(isValidTimeZone(undefined)).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
  it("parseInstant", () => {
    expect(parseInstant("2026-03-10T12:00:00.000Z")?.toISOString()).toBe("2026-03-10T12:00:00.000Z");
    expect(parseInstant("geen datum")).toBeNull();
    expect(parseInstant(undefined)).toBeNull();
    expect(parseInstant("")).toBeNull();
  });
});

describe("normalizeExerciseName", () => {
  it("vergelijkt hoofdletterongevoelig, zonder accenten en met koppeltekens als spatie", () => {
    expect(isSameExercise("Push-Ups", " push ups ")).toBe(true);
    expect(isSameExercise("Romanian Deadlift", "romanian  deadlift")).toBe(true);
    expect(isSameExercise("Bench Press", "Incline Bench Press")).toBe(false);
    expect(normalizeExerciseName("Soulevé de Terre")).toBe("souleve de terre");
  });
});

describe("generateId", () => {
  it("geeft unieke UUID-achtige ids, ook zonder crypto.randomUUID", () => {
    const original = globalThis.crypto.randomUUID;
    try {
      (globalThis.crypto as { randomUUID?: unknown }).randomUUID = undefined;
      const a = generateId();
      const b = generateId();
      expect(a).not.toBe(b);
      expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    } finally {
      globalThis.crypto.randomUUID = original;
    }
  });
});
