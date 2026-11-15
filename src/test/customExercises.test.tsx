import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ExerciseCatalogProvider, ExerciseStore, useExerciseCatalog } from "@/context/ExerciseCatalogContext";
import type { CustomExercise } from "@/utils/customExercises";
import { ExerciseSelector } from "@/components/ExerciseSelector";
import { defaultPplFor, mergeCatalog, parseCustomExercise, searchIn, validateNewExercise } from "@/utils/customExercises";
import { exercises as builtIn } from "@/data/exercises";

vi.mock("@/components/ui/select", async () => await import("./nativeSelectMock"));

class FakeStore implements ExerciseStore {
  docs = new Map<string, Record<string, unknown>>();
  puts: unknown[] = [];
  removed: string[] = [];
  listener: ((d: { id: string; data: Record<string, unknown> }[]) => void) | null = null;
  errorListener: ((e: unknown) => void) | null = null;
  rejectPut: unknown = null;
  listen(onData: FakeStore["listener"], onError: (e: unknown) => void) {
    this.listener = onData;
    this.errorListener = onError;
    queueMicrotask(() => this.emit());
    return () => { this.listener = null; };
  }
  emit() { this.listener?.([...this.docs.entries()].map(([id, data]) => ({ id, data }))); }
  put(e: CustomExercise) {
    this.puts.push(e);
    if (this.rejectPut) return Promise.reject(this.rejectPut);
    this.docs.set(e.id, { ...e } as unknown as Record<string, unknown>);
    return Promise.resolve();
  }
  remove(id: string) { this.removed.push(id); this.docs.delete(id); return Promise.resolve(); }
}

describe("validateNewExercise", () => {
  it("accepteert een geldige oefening en leidt push/pull/legs af van de spiergroep", () => {
    const r = validateNewExercise({ name: "  Pec   Deck Fly ", muscleGroup: "chest", equipment: " Machine " }, builtIn);
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ name: "Pec Deck Fly", muscleGroup: "chest", pplCategory: "push", equipment: "Machine" });
    expect(defaultPplFor("back")).toBe("pull");
    expect(defaultPplFor("quadriceps")).toBe("legs");
  });
  it("weigt te korte/lange namen, een ontbrekende spiergroep en dubbelen (ook met andere hoofdletters of koppeltekens)", () => {
    expect(validateNewExercise({ name: "a", muscleGroup: "chest" }, builtIn).ok).toBe(false);
    expect(validateNewExercise({ name: "x".repeat(61), muscleGroup: "chest" }, builtIn).ok).toBe(false);
    expect(validateNewExercise({ name: "Naam", muscleGroup: "" }, builtIn).message).toMatch(/spiergroep/i);
    expect(validateNewExercise({ name: "bench press", muscleGroup: "chest" }, builtIn).message).toContain("bestaat al");
    expect(validateNewExercise({ name: "Push Ups", muscleGroup: "chest" }, builtIn).ok).toBe(false); // "Push-Ups" bestaat al
    expect(validateNewExercise({ name: "Naam", muscleGroup: "chest", equipment: "y".repeat(41) }, builtIn).ok).toBe(false);
  });
});

describe("parseCustomExercise en mergeCatalog", () => {
  it("slaat ongeldige documenten over en vult ontbrekende velden aan", () => {
    expect(parseCustomExercise("1", { name: "", muscleGroup: "chest" })).toBeNull();
    expect(parseCustomExercise("1", { name: "Iets", muscleGroup: "onzin" })).toBeNull();
    const ok = parseCustomExercise("1", { name: "Iets", muscleGroup: "back" })!;
    expect(ok.pplCategory).toBe("pull");
    expect(ok.custom).toBe(true);
  });
  it("een eigen oefening met dezelfde naam als een ingebouwde wordt niet dubbel getoond", () => {
    const dup = parseCustomExercise("d", { name: "bench press", muscleGroup: "chest" })!;
    const mine = parseCustomExercise("m", { name: "Pec Deck Fly", muscleGroup: "chest" })!;
    const all = mergeCatalog([dup, mine]);
    expect(all.length).toBe(builtIn.length + 1);
    expect(searchIn(all, "pec deck").map((e) => e.name)).toContain("Pec Deck Fly");
    expect(searchIn(all, "   ")).toEqual([]);
  });
});

const Probe = () => {
  const c = useExerciseCatalog();
  return (
    <div>
      <span data-testid="count">{c.custom.length}</span>
      <button onClick={() => (window as unknown as { last: unknown }).last = c.addExercise({ name: "Pec Deck Fly", muscleGroup: "chest" })}>add</button>
      <button onClick={() => c.custom[0] && c.removeExercise(c.custom[0].id)}>remove</button>
    </div>
  );
};

describe("ExerciseCatalogProvider", () => {
  beforeEach(() => vi.clearAllMocks());

  it("toont opgeslagen oefeningen, voegt toe zonder te wachten op de server en verwijdert", async () => {
    const store = new FakeStore();
    store.docs.set("x", { name: "Bicep Curl Machine", muscleGroup: "biceps", pplCategory: "pull", createdAt: "2026-11-02" });
    render(<ExerciseCatalogProvider store={store}><Probe /></ExerciseCatalogProvider>);
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("1"));
    fireEvent.click(screen.getByText("add"));
    expect(screen.getByTestId("count").textContent).toBe("2");
    expect(store.puts).toHaveLength(1);
    expect((window as unknown as { last: { ok: boolean } }).last.ok).toBe(true);
    fireEvent.click(screen.getByText("add")); // dubbel
    expect((window as unknown as { last: { ok: boolean } }).last.ok).toBe(false);
    expect(store.puts).toHaveLength(1);
    fireEvent.click(screen.getByText("remove"));
    expect(store.removed).toHaveLength(1);
    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  it("een mislukte opslag geeft een melding maar laat de app werken", async () => {
    const store = new FakeStore();
    store.rejectPut = { code: "permission-denied" };
    render(<ExerciseCatalogProvider store={store}><Probe /></ExerciseCatalogProvider>);
    await act(async () => { await Promise.resolve(); }); // eerste snapshot
    fireEvent.click(screen.getByText("add"));
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByTestId("count").textContent).toBe("1"); // lokaal zichtbaar; de server-snapshot corrigeert later
    act(() => store.emit()); // de server heeft de schrijfactie geweigerd: de volgende snapshot is leeg
    expect(screen.getByTestId("count").textContent).toBe("0");
  });
});

describe("ExerciseSelector met eigen oefeningen", () => {
  const open = () => fireEvent.click(screen.getByRole("combobox"));

  it("zonder provider is er geen toevoegknop (gedrag als voorheen)", () => {
    render(<ExerciseSelector value="" onChange={vi.fn()} />);
    open();
    expect(screen.queryByText(/eigen oefening toevoegen/i)).toBeNull();
  });

  it("voegt een eigen oefening toe vanuit een mislukte zoekopdracht en kiest hem meteen", async () => {
    const store = new FakeStore();
    const onChange = vi.fn();
    render(<ExerciseCatalogProvider store={store}><ExerciseSelector value="" onChange={onChange} /></ExerciseCatalogProvider>);
    open();
    fireEvent.change(screen.getByPlaceholderText("Zoek oefening..."), { target: { value: "Pec Deck Fly" } });
    fireEvent.click(await screen.findByRole("button", { name: /"Pec Deck Fly" toevoegen/ }));
    expect((await screen.findByLabelText("Naam") as HTMLInputElement).value).toBe("Pec Deck Fly");
    fireEvent.change(screen.getByLabelText("Spiergroep"), { target: { value: "chest" } });
    fireEvent.click(screen.getByRole("button", { name: "Toevoegen" }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith("Pec Deck Fly"));
    expect(store.puts).toHaveLength(1);
  });

  it("toont een fout in de dialog bij een dubbele naam en voegt niets toe", async () => {
    const store = new FakeStore();
    render(<ExerciseCatalogProvider store={store}><ExerciseSelector value="" onChange={vi.fn()} /></ExerciseCatalogProvider>);
    open();
    fireEvent.click(screen.getByText(/eigen oefening toevoegen/i));
    fireEvent.change(await screen.findByLabelText("Naam"), { target: { value: "Bench Press" } });
    fireEvent.change(screen.getByLabelText("Spiergroep"), { target: { value: "chest" } });
    fireEvent.click(screen.getByRole("button", { name: "Toevoegen" }));
    expect((await screen.findByRole("alert")).textContent).toContain("bestaat al");
    expect(store.puts).toHaveLength(0);
  });

  it("een eigen oefening is vindbaar, gemarkeerd als eigen en verwijderen vraagt bevestiging", async () => {
    const store = new FakeStore();
    store.docs.set("x", { name: "Pec Deck Fly", muscleGroup: "chest", pplCategory: "push", createdAt: "" });
    render(<ExerciseCatalogProvider store={store}><ExerciseSelector value="" onChange={vi.fn()} /></ExerciseCatalogProvider>);
    await act(async () => { await Promise.resolve(); });
    open();
    fireEvent.change(screen.getByPlaceholderText("Zoek oefening..."), { target: { value: "pec deck" } });
    expect(await screen.findByText("Eigen")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /pec deck fly uit je lijst halen/i }));
    expect(await screen.findByText(/blijven ongewijzigd/i)).toBeTruthy();
    expect(store.removed).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Verwijderen" }));
    expect(store.removed).toEqual(["x"]);
  });
});
