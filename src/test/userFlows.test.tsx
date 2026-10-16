/**
 * Gebruikersflows op paginaniveau: registreren, herladen, meerdere sessies, bewerken, verwijderen met
 * ongedaan maken, export/import en migratie van oude data. Echte localStorage (jsdom), echte componenten.
 * Alleen de Radix-gebaseerde oefeningkiezer en type-select zijn vervangen door native elementen, omdat
 * Radix-popovers in jsdom niet betrouwbaar te bedienen zijn.
 */
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Index from "@/pages/Index";
import { LEGACY_BACKUP_KEY, LEGACY_STORAGE_KEY, STORAGE_KEY_V2 } from "@/utils/workoutStorage";
import { makeExercise, makeWorkout } from "./factories";

vi.mock("@/components/ExerciseSelector", () => ({
  ExerciseSelector: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input aria-label="Oefening" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock("@/components/ui/select", async () => await import("./nativeSelectMock"));

const renderIndex = () =>
  render(
    <MemoryRouter>
      <Toaster />
      <Index />
    </MemoryRouter>
  );

/** De sectie "Recente Workouts" (niet het formulier, waar dezelfde woorden als opties voorkomen). */
const historySection = async () =>
  (await screen.findByRole("heading", { name: /recente workouts|alle workouts/i })).closest(
    "section"
  ) as HTMLElement;

const readV2 = () => {
  const raw = localStorage.getItem(STORAGE_KEY_V2);
  return raw ? JSON.parse(raw) : null;
};

/** Vult het hoofdformulier in en slaat op. */
async function logWorkout(opts: {
  exercise: string;
  sets: [string, string][];
  type?: string;
  form?: HTMLElement;
}) {
  const scope = opts.form ? within(opts.form) : screen;
  fireEvent.change(scope.getByLabelText("Oefening"), { target: { value: opts.exercise } });
  if (opts.type) fireEvent.change(scope.getByLabelText("Trainingstype"), { target: { value: opts.type } });
  for (let i = 0; i < opts.sets.length; i++) {
    if (i > 0) fireEvent.click(scope.getByRole("button", { name: /set toevoegen/i }));
    const weights = scope.getAllByPlaceholderText("Gewicht");
    const reps = scope.getAllByPlaceholderText("Reps");
    fireEvent.change(weights[i], { target: { value: opts.sets[i][0] } });
    fireEvent.change(reps[i], { target: { value: opts.sets[i][1] } });
  }
  fireEvent.click(scope.getByRole("button", { name: /workout opslaan/i }));
}

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("registreren en herladen", () => {
  it("slaat een workout op met type, UTC-instant, tijdzone en setnummers, en toont geen record bij de eerste keer", async () => {
    renderIndex();
    await waitFor(() => expect(screen.getByRole("button", { name: /workout opslaan/i })).toBeEnabled());

    await logWorkout({ exercise: "Bench Press", sets: [["80", "5"], ["80", "4"]], type: "Push" });

    await screen.findByText(/eerste registratie van bench press/i);
    expect(screen.queryByText(/nieuw persoonlijk record/i)).not.toBeInTheDocument();

    const stored = readV2();
    expect(stored.schemaVersion).toBe(2);
    expect(stored.workouts).toHaveLength(1);
    const w = stored.workouts[0];
    expect(w.trainingType).toBe("Push");
    expect(new Date(w.startedAt).toISOString()).toBe(w.startedAt);
    expect(typeof w.timeZone).toBe("string");
    expect(w.exercises[0].sets.map((s: { setNumber: number }) => s.setNumber)).toEqual([1, 2]);
    expect(w.totalVolume).toBe(80 * 5 + 80 * 4);
    expect(within(await historySection()).getByText("Push")).toBeInTheDocument();
  });

  it("bewaart de workout na herladen (nieuwe render op dezelfde opslag)", async () => {
    const first = renderIndex();
    await waitFor(() => expect(screen.getByRole("button", { name: /workout opslaan/i })).toBeEnabled());
    await logWorkout({ exercise: "Squat", sets: [["100", "5"]], type: "Legs" });
    await screen.findByText(/eerste registratie van squat/i);
    first.unmount();

    renderIndex();
    expect(await screen.findByText("1 oefening")).toBeInTheDocument();
    expect(within(await historySection()).getByText("Legs")).toBeInTheDocument();
    expect(readV2().workouts).toHaveLength(1);
  });

  it("bewaart meerdere workouts op dezelfde dag als afzonderlijke sessies", async () => {
    renderIndex();
    await waitFor(() => expect(screen.getByRole("button", { name: /workout opslaan/i })).toBeEnabled());
    await logWorkout({ exercise: "Bench Press", sets: [["80", "5"]], type: "Push" });
    await screen.findByText("1 oefening");
    await logWorkout({ exercise: "Squat", sets: [["100", "5"]], type: "Legs" });
    await waitFor(() => expect(readV2().workouts).toHaveLength(2));

    const [a, b] = readV2().workouts;
    expect(a.id).not.toBe(b.id);
    expect(new Set(readV2().workouts.map((w: { trainingType: string }) => w.trainingType))).toEqual(
      new Set(["Push", "Legs"])
    );
  });

  it("meldt een echt record bij een zwaardere tweede sessie, met het soort record", async () => {
    renderIndex();
    await waitFor(() => expect(screen.getByRole("button", { name: /workout opslaan/i })).toBeEnabled());
    await logWorkout({ exercise: "Bench Press", sets: [["80", "5"]], type: "Push" });
    await screen.findByText(/eerste registratie/i);
    await logWorkout({ exercise: "bench press", sets: [["85", "5"]], type: "Push" });
    expect(await screen.findByText(/Zwaarste set/)).toBeInTheDocument();
  });

  it("slaat niets op en toont een fout bij een gedeeltelijk ingevulde set", async () => {
    renderIndex();
    await waitFor(() => expect(screen.getByRole("button", { name: /workout opslaan/i })).toBeEnabled());
    await logWorkout({ exercise: "Bench Press", sets: [["80", ""]] });
    expect(await screen.findByText(/controleer je sets/i)).toBeInTheDocument();
    expect(readV2()).toBeNull();
    // Het formulier blijft gevuld.
    expect(screen.getByPlaceholderText("Gewicht")).toHaveValue(80);
  });
});

describe("bewerken en verwijderen", () => {
  const seed = () => {
    localStorage.setItem(
      STORAGE_KEY_V2,
      JSON.stringify({
        schemaVersion: 2,
        savedAt: "2026-03-10T12:00:00.000Z",
        workouts: [
          makeWorkout({ id: "w-old", startedAt: "2026-03-10T12:00:00.000Z" }),
          makeWorkout({
            id: "w-new",
            startedAt: "2026-03-12T12:00:00.000Z",
            exercises: [makeExercise("Squat", [[100, 5]])],
            trainingType: "Legs",
          }),
        ],
      })
    );
  };

  it("bewerken wijzigt dezelfde workout (zelfde id, zelfde moment) en maakt geen nieuwe sessie", async () => {
    seed();
    renderIndex();
    const section = await historySection();
    fireEvent.click(await within(section).findByText("Legs"));
    fireEvent.click(await within(section).findByRole("button", { name: "Workout bewerken" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByPlaceholderText("Reps"), { target: { value: "8" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /wijzigingen opslaan/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const workouts = readV2().workouts;
    expect(workouts).toHaveLength(2);
    const edited = workouts.find((w: { id: string }) => w.id === "w-new");
    expect(edited.startedAt).toBe("2026-03-12T12:00:00.000Z");
    expect(edited.exercises[0].sets[0].reps).toBe(8);
    expect(edited.totalVolume).toBe(800);
    expect(edited.updatedAt).toBeTruthy();
    const untouched = workouts.find((w: { id: string }) => w.id === "w-old");
    expect(untouched.exercises[0].sets).toHaveLength(2);
  });

  it("verwijderen vraagt bevestiging; annuleren verwijdert niets", async () => {
    seed();
    renderIndex();
    const section = await historySection();
    fireEvent.click(await within(section).findByText("Legs"));
    fireEvent.click(await within(section).findByRole("button", { name: "Workout verwijderen" }));

    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /annuleren/i }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(readV2().workouts).toHaveLength(2);
  });

  it("bevestigd verwijderen haalt de workout uit de lijst en kan direct ongedaan gemaakt worden", async () => {
    seed();
    renderIndex();
    const section = await historySection();
    fireEvent.click(await within(section).findByText("Legs"));
    fireEvent.click(await within(section).findByRole("button", { name: "Workout verwijderen" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^verwijderen$/i }));

    await waitFor(() => expect(readV2().workouts).toHaveLength(1));
    expect(readV2().workouts[0].id).toBe("w-old");
    // Niets is definitief weg: de workout staat in de prullenbak van de opslag.
    expect(JSON.stringify(readV2().trash)).toContain("w-new");

    fireEvent.click(await screen.findByRole("button", { name: /ongedaan maken/i }));
    await waitFor(() => expect(readV2().workouts).toHaveLength(2));
    expect(readV2().workouts.map((w: { id: string }) => w.id).sort()).toEqual(["w-new", "w-old"]);
  });
});

describe("export en import", () => {
  const seedOne = () =>
    localStorage.setItem(
      STORAGE_KEY_V2,
      JSON.stringify({ schemaVersion: 2, savedAt: "x", workouts: [makeWorkout({ id: "w-a" })] })
    );

  it("exporteert alle workouts als JSON", async () => {
    seedOne();
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob) => {
      blob = b;
      return "blob:test";
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    renderIndex();
    const button = await screen.findByRole("button", { name: /exporteer/i });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    expect(blob).toBeDefined();
    const payload = JSON.parse(await blob!.text());
    expect(payload.app).toBe("fitnesscoachjones");
    expect(payload.schemaVersion).toBe(2);
    expect(payload.workouts.map((w: { id: string }) => w.id)).toEqual(["w-a"]);
  });

  it("importeert alleen nieuwe workouts en overschrijft bestaande nooit", async () => {
    seedOne();
    renderIndex();
    await screen.findByText("1 oefening");

    const conflicting = makeWorkout({ id: "w-a", trainingType: "Pull" }); // zelfde id, andere inhoud
    const fresh = makeWorkout({ id: "w-b", startedAt: "2026-04-01T10:00:00.000Z" });
    const file = new File(
      [JSON.stringify({ app: "fitnesscoachjones", schemaVersion: 2, workouts: [conflicting, fresh] })],
      "export.json",
      { type: "application/json" }
    );
    fireEvent.change(screen.getByTestId("import-input"), { target: { files: [file] } });

    expect(await screen.findByText("Import klaar")).toBeInTheDocument();
    expect(screen.getByText(/1 geïmporteerd/)).toBeInTheDocument();
    expect(screen.getByText(/1 niet overgenomen/)).toBeInTheDocument();
    const workouts = readV2().workouts;
    expect(workouts.map((w: { id: string }) => w.id).sort()).toEqual(["w-a", "w-b"]);
    expect(workouts.find((w: { id: string }) => w.id === "w-a").trainingType).toBe("Push");
  });

  it("weigt een ongeldig bestand af zonder iets te wijzigen", async () => {
    seedOne();
    renderIndex();
    await screen.findByText("1 oefening");
    const before = localStorage.getItem(STORAGE_KEY_V2);
    const file = new File(["dit is geen json"], "kapot.json", { type: "application/json" });
    fireEvent.change(screen.getByTestId("import-input"), { target: { files: [file] } });
    expect(await screen.findByText("Import mislukt")).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY_V2)).toBe(before);
  });
});

describe("migratie van bestaande gebruikersdata", () => {
  it("leest data uit het oorspronkelijke formaat, bewaart een back-up en laat de oorspronkelijke sleutel intact", async () => {
    const legacy = JSON.stringify([
      {
        id: "old-1",
        userId: "user-1",
        date: "2026-02-01T09:00:00.000Z",
        totalVolume: 400,
        exercises: [
          {
            exercise: "Bench Press",
            sets: [{ weight: 80, reps: 5 }],
            volume: 400,
            estimated1RM: 93,
          },
        ],
      },
    ]);
    localStorage.setItem(LEGACY_STORAGE_KEY, legacy);

    renderIndex();
    expect(await screen.findByText("1 oefening")).toBeInTheDocument();

    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBe(legacy);
    expect(localStorage.getItem(LEGACY_BACKUP_KEY)).toBe(legacy);
    const migrated = readV2().workouts[0];
    expect(migrated.id).toBe("old-1");
    expect(migrated.trainingType).toBe("Onbekend");
    expect(migrated.exercises[0].sets[0].setNumber).toBe(1);
  });
});
