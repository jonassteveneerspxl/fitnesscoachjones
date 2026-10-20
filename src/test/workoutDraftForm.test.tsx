/**
 * Het lopende formulier overleeft een herlaadbeurt of een opgeruimde tab (de bug uit de praktijk: tijdens een
 * training ging alles wat nog niet was opgeslagen verloren). Echte localStorage (jsdom), echte componenten.
 * "Tab opgeruimd" = formulier unmounten en opnieuw mounten: React-state is dan weg, alleen localStorage blijft.
 */
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Index from "@/pages/Index";
import { WorkoutForm } from "@/components/WorkoutForm";
import { DRAFT_KEY, loadDraft } from "@/utils/workoutDraft";
import { STORAGE_KEY_V2 } from "@/utils/workoutStorage";
import { makeWorkout } from "./factories";

vi.mock("@/components/ExerciseSelector", () => ({
  ExerciseSelector: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input aria-label="Oefening" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock("@/components/ui/select", async () => await import("./nativeSelectMock"));

const onSubmit = vi.fn();
const renderForm = (props: Partial<React.ComponentProps<typeof WorkoutForm>> = {}) =>
  render(<WorkoutForm onSubmit={onSubmit} {...props} />);

const type = (label: string | RegExp, value: string, index = 0) =>
  fireEvent.change(screen.getAllByLabelText(label)[index], { target: { value } });
const typePlaceholder = (placeholder: string, value: string, index = 0) =>
  fireEvent.change(screen.getAllByPlaceholderText(placeholder)[index], { target: { value } });

/** Vult een lopende training in: Bench Press, set 1 volledig, set 2 half (alleen gewicht), type Push. */
const fillInProgress = () => {
  type("Oefening", "Bench Press");
  type("Trainingstype", "Push");
  typePlaceholder("Gewicht", "80", 0);
  typePlaceholder("Reps", "5", 0);
  fireEvent.click(screen.getByRole("button", { name: /set toevoegen/i }));
  typePlaceholder("Gewicht", "82.5", 1);
  fireEvent.change(screen.getByPlaceholderText("Opmerkingen (optioneel)"), { target: { value: "schouder voelt stijf" } });
};

beforeEach(() => {
  localStorage.clear();
  onSubmit.mockReset();
  onSubmit.mockResolvedValue(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("concept bewaren tijdens het invullen", () => {
  it("schrijft het formulier weg zodra je iets invult", () => {
    renderForm();
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    type("Oefening", "Squat");
    const draft = loadDraft(localStorage);
    expect(draft?.exercises[0].exercise).toBe("Squat");
  });

  it("een leeg formulier laat geen concept achter", () => {
    renderForm();
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("herstelt alles na een opgeruimde tab: oefening, type, volledige en halve sets, notitie", () => {
    const first = renderForm();
    fillInProgress();
    first.unmount(); // tab opgeruimd: state weg, localStorage blijft

    renderForm();
    expect(screen.getByText("Concept hersteld")).toBeInTheDocument();
    expect((screen.getByLabelText("Oefening") as HTMLInputElement).value).toBe("Bench Press");
    expect((screen.getByLabelText("Trainingstype") as HTMLSelectElement).value).toBe("Push");
    expect((screen.getAllByPlaceholderText("Gewicht") as HTMLInputElement[]).map((i) => i.value)).toEqual(["80", "82.5"]);
    expect((screen.getAllByPlaceholderText("Reps") as HTMLInputElement[]).map((i) => i.value)).toEqual(["5", ""]);
    expect((screen.getByPlaceholderText("Opmerkingen (optioneel)") as HTMLTextAreaElement).value).toBe("schouder voelt stijf");
  });

  it("overschrijft een bewaard concept niet met een leeg formulier bij het openen", () => {
    const first = renderForm();
    fillInProgress();
    first.unmount();
    const before = localStorage.getItem(DRAFT_KEY);
    expect(before).not.toBeNull();

    renderForm(); // enkel openen, niets aanraken
    expect(loadDraft(localStorage)?.exercises[0].exercise).toBe("Bench Press");
    expect(loadDraft(localStorage)?.exercises[0].sets).toHaveLength(2);
  });

  it("blijft werken na meerdere keren herstellen en verder invullen", () => {
    const a = renderForm();
    fillInProgress();
    a.unmount();
    const b = renderForm();
    typePlaceholder("Reps", "6", 1);
    b.unmount();
    renderForm();
    expect((screen.getAllByPlaceholderText("Reps") as HTMLInputElement[]).map((i) => i.value)).toEqual(["5", "6"]);
  });

  it("bewaart ook een geladen template", () => {
    const a = renderForm();
    fireEvent.click(screen.getByRole("button", { name: /kies workout template/i }));
    return waitFor(() => screen.getByRole("button", { name: /push day - beginner/i })).then((btn) => {
      fireEvent.click(btn);
      a.unmount();
      renderForm();
      expect((screen.getByLabelText("Oefening") as HTMLInputElement).value).toBe("Bench Press");
      expect((screen.getByLabelText("Trainingstype") as HTMLSelectElement).value).toBe("Push");
    });
  });
});

describe("concept opruimen", () => {
  it("een geslaagde opslag wist het concept en het formulier", async () => {
    renderForm();
    fillInProgress();
    typePlaceholder("Reps", "5", 1);
    fireEvent.click(screen.getByRole("button", { name: /workout opslaan/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(localStorage.getItem(DRAFT_KEY)).toBeNull());
    expect((screen.getByLabelText("Oefening") as HTMLInputElement).value).toBe("");
  });

  it("een mislukte opslag houdt formulier én concept intact", async () => {
    onSubmit.mockResolvedValue(false);
    renderForm();
    fillInProgress();
    typePlaceholder("Reps", "5", 1);
    fireEvent.click(screen.getByRole("button", { name: /workout opslaan/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect((screen.getByLabelText("Oefening") as HTMLInputElement).value).toBe("Bench Press");
    expect(loadDraft(localStorage)?.exercises[0].exercise).toBe("Bench Press");
  });

  it("weggooien vraagt eerst bevestiging; annuleren bewaart alles", async () => {
    const a = renderForm();
    fillInProgress();
    a.unmount();
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: /concept weggooien/i }));
    const dialog = await screen.findByRole("alertdialog");
    expect(loadDraft(localStorage)).not.toBeNull(); // nog niets gewist
    fireEvent.click(within(dialog).getByRole("button", { name: /annuleren/i }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect((screen.getByLabelText("Oefening") as HTMLInputElement).value).toBe("Bench Press");
    expect(loadDraft(localStorage)).not.toBeNull();
  });

  it("weggooien na bevestiging wist formulier en concept", async () => {
    const a = renderForm();
    fillInProgress();
    a.unmount();
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: /concept weggooien/i }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^weggooien$/i }));
    await waitFor(() => expect(localStorage.getItem(DRAFT_KEY)).toBeNull());
    expect((screen.getByLabelText("Oefening") as HTMLInputElement).value).toBe("");
    expect(screen.queryByText("Concept hersteld")).toBeNull();
  });

  it("'Doorgaan' verbergt alleen de melding en bewaart het concept", () => {
    const a = renderForm();
    fillInProgress();
    a.unmount();
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: /^doorgaan$/i }));
    expect(screen.queryByText("Concept hersteld")).toBeNull();
    expect((screen.getByLabelText("Oefening") as HTMLInputElement).value).toBe("Bench Press");
    expect(loadDraft(localStorage)).not.toBeNull();
  });
});

describe("randgevallen", () => {
  it("een kapot concept laat een leeg, werkend formulier zien", () => {
    localStorage.setItem(DRAFT_KEY, "{ kapot");
    renderForm();
    expect(screen.queryByText("Concept hersteld")).toBeNull();
    expect((screen.getByLabelText("Oefening") as HTMLInputElement).value).toBe("");
    type("Oefening", "Row");
    expect(loadDraft(localStorage)?.exercises[0].exercise).toBe("Row");
  });

  it("werkt zonder bruikbare opslag (vol of geblokkeerd) zonder fout", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("vol", "QuotaExceededError");
    });
    expect(() => {
      renderForm();
      type("Oefening", "Row");
    }).not.toThrow();
    expect((screen.getByLabelText("Oefening") as HTMLInputElement).value).toBe("Row");
  });

  it("bewerkmodus leest en wijzigt het concept van een nieuwe workout niet", () => {
    const a = renderForm();
    fillInProgress();
    a.unmount();
    const raw = localStorage.getItem(DRAFT_KEY);

    renderForm({ initialWorkout: makeWorkout(), submitLabel: "Wijzigingen Opslaan" });
    expect(screen.queryByText("Concept hersteld")).toBeNull();
    typePlaceholder("Reps", "9", 0);
    expect(localStorage.getItem(DRAFT_KEY)).toBe(raw);
  });

  it("een lopend concept verschijnt weer in de gewone pagina en raakt opgeslagen workouts niet aan", async () => {
    const stored = JSON.stringify({ schemaVersion: 2, workouts: [makeWorkout()], trash: [] });
    localStorage.setItem(STORAGE_KEY_V2, stored);
    const a = renderForm();
    fillInProgress();
    a.unmount();

    render(
      <MemoryRouter>
        <Toaster />
        <Index />
      </MemoryRouter>
    );
    expect(await screen.findByText("Concept hersteld")).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY_V2)).toBe(stored);
  });
});

describe("echte opslagflow via de pagina", () => {
  it("opslaan zet de workout in de opslag en wist het concept", async () => {
    render(
      <MemoryRouter>
        <Toaster />
        <Index />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByRole("button", { name: /workout opslaan/i })).toBeEnabled());
    fillInProgress();
    typePlaceholder("Reps", "5", 1);
    expect(loadDraft(localStorage)).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /workout opslaan/i }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY_V2) ?? "{}").workouts?.length).toBe(1));
    await waitFor(() => expect(localStorage.getItem(DRAFT_KEY)).toBeNull());
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_V2)!).workouts[0];
    expect(saved.exercises[0].sets.map((s: { weight: number; reps: number }) => [s.weight, s.reps])).toEqual([
      [80, 5],
      [82.5, 5],
    ]);
  });

  it("als de opslag van de workout zelf mislukt, blijft het concept staan zodat niets verloren gaat", async () => {
    const realSet = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === STORAGE_KEY_V2) throw new DOMException("vol", "QuotaExceededError");
      return realSet.call(this, key, value);
    });
    render(
      <MemoryRouter>
        <Toaster />
        <Index />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByRole("button", { name: /workout opslaan/i })).toBeEnabled());
    fillInProgress();
    typePlaceholder("Reps", "5", 1);
    fireEvent.click(screen.getByRole("button", { name: /workout opslaan/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /workout opslaan/i })).toBeEnabled());
    await new Promise((r) => setTimeout(r, 100));
    expect(loadDraft(localStorage)?.exercises[0].exercise).toBe("Bench Press");
    expect((screen.getByLabelText("Oefening") as HTMLInputElement).value).toBe("Bench Press");
  });
});
