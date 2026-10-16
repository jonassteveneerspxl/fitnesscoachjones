/**
 * Statistiekenpagina met geseede data. Grafieken tekenen in jsdom niet (geen layout), dus de tests lezen de
 * gegevenstabellen onder elke grafiek en de tekstblokken: die tonen dezelfde berekende getallen.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Statistics from "@/pages/Statistics";
import { STORAGE_KEY_V2 } from "@/utils/workoutStorage";
import { makeExercise, makeWorkout } from "./factories";
import type { Workout } from "@/types/workout";

vi.mock("@/components/ui/select", async () => await import("./nativeSelectMock"));

const BRU = "Europe/Brussels";
const bench = (...p: [number, number][]) => makeExercise("Bench Press", p);
const squat = (...p: [number, number][]) => makeExercise("Squat", p);

const seed = (workouts: Workout[]) =>
  localStorage.setItem(
    STORAGE_KEY_V2,
    JSON.stringify({ schemaVersion: 2, savedAt: "2026-03-20T00:00:00.000Z", workouts })
  );

const A = makeWorkout({ id: "A", startedAt: "2026-02-02T10:00:00.000Z", timeZone: BRU, trainingType: "Push", exercises: [bench([80, 5], [80, 5])] });
const B = makeWorkout({ id: "B", startedAt: "2026-03-02T10:00:00.000Z", timeZone: BRU, trainingType: "Push", exercises: [bench([85, 5]), squat([100, 5])] });
const C = makeWorkout({ id: "C", startedAt: "2026-03-04T09:00:00.000Z", timeZone: BRU, trainingType: "Legs", exercises: [squat([100, 5], [100, 5])] });
const D = makeWorkout({ id: "D", startedAt: "2026-03-04T18:00:00.000Z", timeZone: BRU, trainingType: "Push", exercises: [bench([90, 3])] });
const E = makeWorkout({ id: "E", startedAt: null, timeZone: null, trainingType: "Onbekend", exercises: [bench([200, 5])] }); // zonder datum
const F = makeWorkout({ id: "F", startedAt: "2026-03-10T10:00:00.000Z", timeZone: BRU, trainingType: "Custom", exercises: [makeExercise("Bench Press", [])] }); // zonder sets
const ALL = [A, B, C, D, E, F];

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/statistieken"]}>
      <Statistics />
    </MemoryRouter>
  );

const section = (name: RegExp | string) => screen.getByRole("region", { name });
const kpi = (label: string) => within(screen.getByRole("region", { name: "Samenvatting" })).getByText(label).parentElement as HTMLElement;
const ready = () => screen.findByRole("region", { name: "Samenvatting" });
const select = (label: string) => screen.getByLabelText(label);
const COUNT_TABS = "Indeling van het aantal trainingen";
const VOLUME_TABS = "Indeling van het trainingsvolume";
// Beide grafiekkaarten hebben een week/maand-schakelaar; kies dus eerst de juiste tablist.
const mouseDownTab = (group: string, name: string) =>
  fireEvent.mouseDown(within(screen.getByRole("tablist", { name: group })).getByRole("tab", { name }), { button: 0 });

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-03-20T12:00:00.000Z"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("lege en gedeeltelijke data", () => {
  it("toont een lege staat met link naar de trainingspagina", async () => {
    renderPage();
    expect(await screen.findByText("Nog geen statistieken")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /naar je training/i })).toHaveAttribute("href", "/");
  });

  it("meldt workouts zonder datum of sets en vult niets in", async () => {
    seed(ALL);
    renderPage();
    expect(await screen.findByText(/niet alle workouts kunnen volledig meetellen/i)).toBeInTheDocument();
    expect(screen.getByText(/1 workout zonder geldige datum/)).toBeInTheDocument();
    expect(screen.getByText(/1 workout zonder setgegevens/)).toBeInTheDocument();
    // E (200 kg, zonder datum) mag nergens meetellen
    expect(kpi("Trainingen")).toHaveTextContent("5");
    expect(screen.queryByText(/200 kg/)).not.toBeInTheDocument();
  });
});

describe("overzicht, tellingen en volume", () => {
  beforeEach(() => seed(ALL));

  it("berekent samenvatting uit de sets: 5 gedateerde trainingen, 2.995 kg", async () => {
    renderPage();
    await ready();
    expect(kpi("Trainingen")).toHaveTextContent("5");
    expect(kpi("Totaal volume")).toHaveTextContent("2.995 kg");
    expect(kpi("Oefeningen")).toHaveTextContent("2");
  });

  it("telt trainingen per ISO-week inclusief lege weken en meerdere trainingen op één dag", async () => {
    renderPage();
    await ready();
    const card = screen.getByText("Trainingen per periode").closest("section") as HTMLElement;
    const rows = within(card).getAllByRole("row").map((r) => r.textContent);
    expect(rows).toEqual(
      expect.arrayContaining(["wk 6 · 20261", "wk 7 · 20260", "wk 8 · 20260", "wk 9 · 20260", "wk 10 · 20263", "wk 11 · 20261"])
    );
  });

  it("schakelt naar maanden", async () => {
    renderPage();
    await ready();
    mouseDownTab(COUNT_TABS, "Per maand");
    const card = screen.getByText("Trainingen per periode").closest("section") as HTMLElement;
    const rows = within(card).getAllByRole("row").map((r) => r.textContent);
    expect(rows).toEqual(expect.arrayContaining(["februari 20261", "maart 20264"]));
  });

  it("toont volume per training met herberekende waarden en laat een training zonder sets weg", async () => {
    renderPage();
    await ready();
    const card = screen.getByText("Trainingsvolume over tijd").closest("section") as HTMLElement;
    const rows = within(card).getAllByRole("row").slice(1).map((r) => r.textContent);
    expect(rows).toHaveLength(4); // F heeft geen sets
    expect(rows.join("|")).toMatch(/800/);
    expect(rows.join("|")).toMatch(/925/);
    expect(rows.join("|")).toMatch(/1\.000/);
    expect(rows.join("|")).toMatch(/270/);
  });

  it("weekvolume: weken zonder training zijn 0, niet leeg", async () => {
    renderPage();
    await ready();
    mouseDownTab(VOLUME_TABS, "Per week");
    const card = screen.getByText("Trainingsvolume over tijd").closest("section") as HTMLElement;
    const rows = within(card).getAllByRole("row").map((r) => r.textContent);
    expect(rows).toEqual(expect.arrayContaining(["wk 7 · 20260", "wk 10 · 20262.195"]));
  });
});

describe("filters", () => {
  beforeEach(() => seed(ALL));

  it("trainingstype: alleen Push-trainingen tellen", async () => {
    renderPage();
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Push" }));
    expect(kpi("Trainingen")).toHaveTextContent("3");
    expect(kpi("Totaal volume")).toHaveTextContent("1.995 kg");
  });

  it("meerdere types samen en geen type = alles", async () => {
    renderPage();
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Push" }));
    fireEvent.click(screen.getByRole("button", { name: "Legs" }));
    expect(kpi("Trainingen")).toHaveTextContent("4");
    fireEvent.click(screen.getByRole("button", { name: "Push" }));
    fireEvent.click(screen.getByRole("button", { name: "Legs" }));
    expect(kpi("Trainingen")).toHaveTextContent("5");
  });

  it("oefeningfilter: volume telt alleen die oefening en de progressie verschijnt", async () => {
    renderPage();
    await ready();
    expect(screen.getByText(/kies een oefening om de progressie te zien/i)).toBeInTheDocument();
    fireEvent.change(select("Oefening"), { target: { value: "squat" } });
    expect(kpi("Trainingen")).toHaveTextContent("2"); // B en C
    expect(kpi("Totaal volume")).toHaveTextContent("1.500 kg");
    expect(screen.getByText("Progressie: Squat")).toBeInTheDocument();
    const weight = screen.getByText("Gewicht (zwaarste set)").closest("section") as HTMLElement;
    expect(within(weight).getAllByRole("row").slice(1).map((r) => r.textContent)).toEqual([
      "2 mrt 2026100",
      "4 mrt 2026100",
    ]);
    const volume = screen.getByText("Volume van de oefening").closest("section") as HTMLElement;
    expect(within(volume).getAllByRole("row").slice(1).map((r) => r.textContent)).toEqual([
      "2 mrt 2026500",
      "4 mrt 20261.000",
    ]);
  });

  it("periode: 'Laatste 4 weken' sluit oudere workouts uit (peildatum 20 maart)", async () => {
    renderPage();
    await ready();
    fireEvent.change(select("Periode"), { target: { value: "4w" } });
    expect(kpi("Trainingen")).toHaveTextContent("4"); // A (2 feb) valt weg
  });

  it("aangepaste periode is inclusief begin- en einddag en waarschuwt bij omgekeerd bereik", async () => {
    renderPage();
    await ready();
    fireEvent.change(select("Periode"), { target: { value: "custom" } });
    fireEvent.change(screen.getByLabelText("Van"), { target: { value: "2026-03-04" } });
    fireEvent.change(screen.getByLabelText("Tot en met"), { target: { value: "2026-03-04" } });
    expect(kpi("Trainingen")).toHaveTextContent("2"); // C en D, dezelfde dag
    fireEvent.change(screen.getByLabelText("Van"), { target: { value: "2026-03-10" } });
    // Er staan meerdere meldingen op de pagina (o.a. over workouts zonder datum); de filterwaarschuwing zit in de filters.
    expect(within(section("Filters")).getByRole("alert")).toHaveTextContent(/einddatum ligt voor de begindatum/i);
    expect(kpi("Trainingen")).toHaveTextContent("0");
  });

  it("'Herstel' zet alle filters terug", async () => {
    renderPage();
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Push" }));
    fireEvent.change(select("Oefening"), { target: { value: "bench press" } });
    fireEvent.click(screen.getByRole("button", { name: /herstel/i }));
    expect(kpi("Trainingen")).toHaveTextContent("5");
    expect(screen.getByText(/kies een oefening om de progressie te zien/i)).toBeInTheDocument();
  });
});

describe("persoonlijke records", () => {
  it("toont de vier recordtypes per oefening met datum", async () => {
    seed(ALL);
    renderPage();
    await ready();
    fireEvent.change(select("Oefening"), { target: { value: "bench press" } });
    const records = section("Persoonlijke records");
    const row = within(records).getByRole("row", { name: /bench press/i });
    expect(row).toHaveTextContent("90 kg × 3"); // zwaarste set (4 mrt)
    expect(row).toHaveTextContent("425 kg (85 × 5)"); // beste set (2 mrt)
    expect(row).toHaveTextContent("800 kg in 2 sets"); // beste oefeningvolume (2 feb)
    expect(row).toHaveTextContent("4 mrt 2026");
  });

  it("toont '–' (geen gegevens) in plaats van 0 voor ontbrekende records", async () => {
    seed([makeWorkout({ id: "P", startedAt: "2026-03-02T10:00:00.000Z", timeZone: BRU, exercises: [makeExercise("Push-Ups", [[0, 20]])] })]);
    renderPage();
    await ready();
    const row = within(section("Persoonlijke records")).getByRole("row", { name: /push-ups/i });
    expect(within(row).getAllByTitle("Geen gegevens")).toHaveLength(4);
  });
});

describe("vooruitgang t.o.v. vorige sessie en historiek", () => {
  beforeEach(() => seed(ALL));

  it("vergelijkt per oefening met de vorige sessie en benoemt gemengde uitkomsten", async () => {
    renderPage();
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Push" })); // nieuwste Push = D
    const progress = section(/vooruitgang ten opzichte van de vorige sessie/i);
    expect(within(progress).getByText("Gemengd")).toBeInTheDocument(); // 90×3 vs 85×5: zwaarder maar minder volume
    expect(within(progress).getByText(/vergeleken met 2 mrt 2026/i)).toBeInTheDocument();
    expect(progress).toHaveTextContent("+5 kg"); // zwaarste set
    expect(progress).toHaveTextContent(/[-−]155 kg/); // volume 270 vs 425 (Intl gebruikt een gewoon streepje als minteken)
  });

  it("de eerste registratie van een oefening is 'Eerste keer', niet 'Vooruitgang'", async () => {
    renderPage();
    await ready();
    fireEvent.change(select("Kies een sessie"), { target: { value: "A" } });
    const progress = section(/vooruitgang ten opzichte van de vorige sessie/i);
    expect(within(progress).getByText("Eerste keer")).toBeInTheDocument();
    expect(progress).toHaveTextContent(/dit is je uitgangspunt/i);
  });

  it("een gekozen sessie zonder setgegevens toont dat eerlijk", async () => {
    renderPage();
    await ready();
    // F (10 maart) is de nieuwste en heeft geen sets
    expect(section(/vooruitgang ten opzichte van de vorige sessie/i)).toHaveTextContent(/geen setgegevens om te vergelijken/i);
  });

  it("historiek: sessie uitklappen toont sets en vergelijking", async () => {
    renderPage();
    await ready();
    const history = section("Historiek");
    const toggles = within(history).getAllByRole("button", { expanded: false });
    expect(toggles.length).toBe(5);
    fireEvent.click(toggles[1]); // D, tweede nieuwste na F
    expect(within(history).getByText("90kg × 3")).toBeInTheDocument();
    expect(within(history).getByText("Gemengd")).toBeInTheDocument();
  });
});
