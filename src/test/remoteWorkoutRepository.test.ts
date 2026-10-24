import { describe, it, expect, beforeEach, vi } from "vitest";
import { createRemoteWorkoutRepository, describeRemoteError, type RemoteWorkoutRepository } from "@/utils/remoteWorkoutRepository";
import { FakeBackend, tick } from "./fakeBackend";
import { makeExercise, makeWorkout } from "./factories";

const UID = "uid-jonas";
const NOW = new Date("2026-10-21T12:00:00.000Z");

let backend: FakeBackend;
let onWriteError: ReturnType<typeof vi.fn>;
const make = (over: Partial<Parameters<typeof createRemoteWorkoutRepository>[0]> = {}): RemoteWorkoutRepository =>
  createRemoteWorkoutRepository({ uid: UID, backend, onWriteError, now: () => NOW, loadTimeoutMs: 200, ...over });

const doc = (w = makeWorkout(), extra: Record<string, unknown> = {}) =>
  JSON.parse(JSON.stringify({ ...w, ...extra })) as Record<string, unknown>;

beforeEach(() => {
  backend = new FakeBackend();
  onWriteError = vi.fn();
});

describe("laden", () => {
  it("een lege database geeft een lege lijst", async () => {
    const result = await make().load();
    expect(result).toMatchObject({ workouts: [], trash: [], status: "empty", readOnly: false, warnings: [] });
  });

  it("leest workouts, nieuwste eerst, en houdt de prullenbak apart", async () => {
    backend.seed("a", doc(makeWorkout({ id: "a", startedAt: "2026-03-01T10:00:00.000Z" })));
    backend.seed("b", doc(makeWorkout({ id: "b", startedAt: "2026-04-01T10:00:00.000Z" })));
    backend.seed("c", doc(makeWorkout({ id: "c" }), { deletedAt: "2026-05-01T00:00:00.000Z" }));
    const result = await make().load();
    expect(result.status).toBe("loaded");
    expect(result.workouts.map((w) => w.id)).toEqual(["b", "a"]);
    expect(result.trash.map((t) => t.workout.id)).toEqual(["c"]);
    expect(result.trash[0].deletedAt).toBe("2026-05-01T00:00:00.000Z");
  });

  it("neemt het id van het document over en herberekent afgeleide waarden uit de sets", async () => {
    const data = doc(makeWorkout({ id: "fout-id" }), { totalVolume: 999999 });
    data.exercises = [{ exercise: "Squat", sets: [{ setNumber: 1, weight: 100, reps: 5 }], volume: 1, estimated1RM: 1 }];
    backend.seed("echt-id", data);
    const [w] = (await make().load()).workouts;
    expect(w.id).toBe("echt-id");
    expect(w.totalVolume).toBe(500);
    expect(w.exercises[0].volume).toBe(500);
  });

  it("slaat een onleesbaar document over met een waarschuwing en raakt het niet aan", async () => {
    backend.seed("goed", doc(makeWorkout({ id: "goed" })));
    backend.seed("kapot", { iets: "anders" });
    const result = await make().load();
    expect(result.workouts.map((w) => w.id)).toEqual(["goed"]);
    expect(result.warnings.join(" ")).toMatch(/kapot/);
    expect(backend.writes).toHaveLength(0);
    expect(backend.docs.has("kapot")).toBe(true);
  });

  it("toont maximaal 50 items uit de prullenbak, maar verwijdert er niets van", async () => {
    for (let i = 0; i < 60; i++) {
      backend.seed(`t${i}`, doc(makeWorkout({ id: `t${i}` }), { deletedAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString() }));
    }
    const result = await make().load();
    expect(result.trash).toHaveLength(50);
    expect(result.trash[0].workout.id).toBe("t59");
    expect(backend.docs.size).toBe(60);
  });

  it("luistert maar één keer, ook bij meerdere load()-aanroepen", async () => {
    const repo = make();
    await Promise.all([repo.load(), repo.load()]);
    await repo.load();
    expect(backend.listenCalls).toBe(1);
  });
});

describe("toevoegen", () => {
  it("schrijft één volledig document onder het id, met gebruiker, aanmaakmoment en schemaversie", async () => {
    const repo = make();
    const result = await repo.add(makeWorkout({ id: "nieuw", userId: "user-1" }));
    expect(result.ok).toBe(true);
    expect(result.workouts.map((w) => w.id)).toEqual(["nieuw"]);
    expect(backend.writes).toHaveLength(1);
    expect(backend.writes[0]).toHaveLength(1);
    const written = backend.writes[0][0];
    expect(written.id).toBe("nieuw");
    expect(written.data).toMatchObject({ id: "nieuw", userId: UID, createdAt: NOW.toISOString(), schemaVersion: 2, trainingType: "Push" });
    expect(written.data).not.toHaveProperty("deletedAt");
  });

  it("laat geen undefined-waarden door (Firestore weigert die)", async () => {
    const repo = make();
    await repo.add(makeWorkout({ id: "n", exercises: [makeExercise("Bench Press", [[80, 5]])] }));
    const text = JSON.stringify(backend.writes[0][0].data);
    expect(text).not.toContain("undefined");
    expect(Object.values(backend.writes[0][0].data).includes(undefined as never)).toBe(false);
  });

  it("weigert een bestaand id en overschrijft niets", async () => {
    backend.seed("x", doc(makeWorkout({ id: "x" })));
    const repo = make();
    const result = await repo.add(makeWorkout({ id: "x", trainingType: "Pull" }));
    expect(result).toMatchObject({ ok: false, error: "duplicate-id" });
    expect(backend.writes).toHaveLength(0);
    expect(backend.docs.get("x")!.trainingType).toBe("Push");
  });

  it("weigert ook een id dat in de prullenbak staat", async () => {
    backend.seed("x", doc(makeWorkout({ id: "x" }), { deletedAt: "2026-05-01T00:00:00.000Z" }));
    const result = await make().add(makeWorkout({ id: "x" }));
    expect(result).toMatchObject({ ok: false, error: "duplicate-id" });
    expect(backend.writes).toHaveLength(0);
  });

  it("weigert een ongeldige workout zonder iets te schrijven", async () => {
    const result = await make().add({ id: "x", exercises: "geen lijst" } as never);
    expect(result).toMatchObject({ ok: false, error: "invalid" });
    expect(backend.writes).toHaveLength(0);
  });

  it("werkt zonder bereik: direct bruikbaar, schrijf-promise blijft open, geen fout, later bevestigd", async () => {
    const repo = make();
    await repo.load();
    backend.offline = true;
    const result = await repo.add(makeWorkout({ id: "offline" }));
    expect(result.ok).toBe(true);
    expect((await repo.load()).workouts.map((w) => w.id)).toEqual(["offline"]);
    await tick();
    expect(onWriteError).not.toHaveBeenCalled();
    backend.goOnline();
    await tick();
    expect(onWriteError).not.toHaveBeenCalled();
    expect((await repo.load()).workouts.map((w) => w.id)).toEqual(["offline"]);
  });

  it("meerdere wijzigingen kort na elkaar blijven consistent, ook voordat een snapshot terug is", async () => {
    const repo = make();
    await repo.load();
    await repo.add(makeWorkout({ id: "1", startedAt: "2026-10-01T10:00:00.000Z" }));
    await repo.add(makeWorkout({ id: "2", startedAt: "2026-10-02T10:00:00.000Z" }));
    const removed = await repo.remove("1");
    expect(removed.workouts.map((w) => w.id)).toEqual(["2"]);
    expect(removed.trash.map((t) => t.workout.id)).toEqual(["1"]);
    await tick();
    const after = await repo.load();
    expect(after.workouts.map((w) => w.id)).toEqual(["2"]);
    expect(after.trash.map((t) => t.workout.id)).toEqual(["1"]);
  });

  it("een synchrone schrijffout geeft storage-error en laat de stand ongewijzigd", async () => {
    const repo = make();
    await repo.add(makeWorkout({ id: "bestaat" }));
    backend.throwOnWrite = Object.assign(new Error("kapot"), { code: "invalid-argument" });
    const result = await repo.add(makeWorkout({ id: "nieuw" }));
    expect(result).toMatchObject({ ok: false, error: "storage-error" });
    expect(result.workouts.map((w) => w.id)).toEqual(["bestaat"]);
  });
});

describe("bijwerken", () => {
  it("wijzigt type en oefeningen, herberekent totalen en laat id, gebruiker, starttijd, tijdzone en aanmaakmoment staan", async () => {
    const original = makeWorkout({ id: "w", createdAt: "2026-01-01T00:00:00.000Z" });
    backend.seed("w", doc(original));
    const repo = make();
    await repo.load();
    const result = await repo.update("w", { trainingType: "Legs", exercises: [makeExercise("Squat", [[100, 5], [100, 5]])] });
    expect(result.ok).toBe(true);
    const updated = result.workouts[0];
    expect(updated).toMatchObject({
      id: "w",
      userId: original.userId,
      startedAt: original.startedAt,
      timeZone: original.timeZone,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: NOW.toISOString(),
      trainingType: "Legs",
      totalVolume: 1000,
    });
    expect(backend.writes[0][0].data).toMatchObject({ id: "w", trainingType: "Legs", totalVolume: 1000 });
    expect(backend.docs.size).toBe(1);
  });

  it("geeft not-found voor een onbekend id en schrijft niets", async () => {
    const repo = make();
    await repo.load();
    const result = await repo.update("bestaat-niet", { trainingType: "Push", exercises: [makeExercise("Squat", [[1, 1]])] });
    expect(result).toMatchObject({ ok: false, error: "not-found" });
    expect(backend.writes).toHaveLength(0);
  });

  it("weigert een ongeldige wijziging en bewaart het origineel", async () => {
    backend.seed("w", doc(makeWorkout({ id: "w" })));
    const repo = make();
    await repo.load();
    const result = await repo.update("w", { trainingType: "Push", exercises: "kapot" as never });
    expect(result).toMatchObject({ ok: false, error: "invalid" });
    expect(backend.writes).toHaveLength(0);
  });

  it("kan een verwijderde workout niet bijwerken", async () => {
    backend.seed("w", doc(makeWorkout({ id: "w" }), { deletedAt: "2026-05-01T00:00:00.000Z" }));
    const repo = make();
    await repo.load();
    const result = await repo.update("w", { trainingType: "Push", exercises: [makeExercise("Squat", [[1, 1]])] });
    expect(result).toMatchObject({ ok: false, error: "not-found" });
  });
});

describe("verwijderen en herstellen: nooit definitief weg", () => {
  it("verwijderen zet alleen deletedAt; er is nooit een delete en het document blijft bestaan", async () => {
    backend.seed("w", doc(makeWorkout({ id: "w" })));
    const repo = make();
    await repo.load();
    const result = await repo.remove("w");
    expect(result.ok).toBe(true);
    expect(result.workouts).toHaveLength(0);
    expect(result.trash[0]).toMatchObject({ deletedAt: NOW.toISOString() });
    expect(backend.docs.has("w")).toBe(true);
    expect(backend.docs.get("w")).toMatchObject({ deletedAt: NOW.toISOString(), exercises: expect.any(Array) });
    expect(backend.writes[0]).toHaveLength(1);
  });

  it("de backend-interface heeft geen verwijderoperatie", () => {
    expect(Object.keys(Object.getPrototypeOf(backend)).concat(Object.getOwnPropertyNames(Object.getPrototypeOf(backend)))).not.toContain("delete");
    expect(Object.getOwnPropertyNames(Object.getPrototypeOf(backend))).not.toContain("remove");
  });

  it("herstellen haalt deletedAt weg en zet de workout terug met alle gegevens", async () => {
    backend.seed("w", doc(makeWorkout({ id: "w" }), { deletedAt: "2026-05-01T00:00:00.000Z" }));
    const repo = make();
    await repo.load();
    const result = await repo.restore("w");
    expect(result.ok).toBe(true);
    expect(result.workouts.map((w) => w.id)).toEqual(["w"]);
    expect(result.trash).toHaveLength(0);
    expect(backend.docs.get("w")).not.toHaveProperty("deletedAt");
    expect(backend.docs.get("w")).toMatchObject({ id: "w", trainingType: "Push" });
  });

  it("verwijderen, herstellen en nogmaals verwijderen verliest nooit gegevens", async () => {
    const repo = make();
    await repo.load();
    await repo.add(makeWorkout({ id: "w", exercises: [makeExercise("Bench Press", [[80, 5], [82.5, 4]])] }));
    await repo.remove("w");
    await repo.restore("w");
    await repo.remove("w");
    await tick();
    const doc1 = backend.docs.get("w") as { exercises: { sets: { weight: number; reps: number }[] }[] };
    expect(doc1.exercises[0].sets.map((s) => [s.weight, s.reps])).toEqual([[80, 5], [82.5, 4]]);
    expect(backend.docs.size).toBe(1);
  });

  it("geeft not-found voor onbekende ids", async () => {
    const repo = make();
    await repo.load();
    expect(await repo.remove("x")).toMatchObject({ ok: false, error: "not-found" });
    expect(await repo.restore("x")).toMatchObject({ ok: false, error: "not-found" });
  });
});

describe("importeren", () => {
  it("voegt alleen toe, zet de gebruiker op de ingelogde, en slaat identieke over", async () => {
    const existing = makeWorkout({ id: "bestaat", userId: UID, createdAt: "2026-01-01T00:00:00.000Z" });
    backend.seed("bestaat", doc(existing));
    const repo = make();
    await repo.load();
    const result = await repo.importWorkouts([
      makeWorkout({ id: "bestaat", userId: "user-1" }),
      makeWorkout({ id: "nieuw-1", userId: "user-1" }),
      makeWorkout({ id: "nieuw-2", userId: "user-1" }),
    ]);
    expect(result).toMatchObject({ ok: true, imported: 2, skippedDuplicates: 1, conflicts: 0, invalid: 0 });
    expect(backend.writes).toHaveLength(1);
    expect(backend.writes[0].map((o) => o.id).sort()).toEqual(["nieuw-1", "nieuw-2"]);
    expect(backend.writes[0].every((o) => o.data.userId === UID)).toBe(true);
  });

  it("overschrijft nooit een bestaand id met andere inhoud en meldt het als conflict", async () => {
    backend.seed("w", doc(makeWorkout({ id: "w", trainingType: "Push" })));
    const repo = make();
    await repo.load();
    const result = await repo.importWorkouts([makeWorkout({ id: "w", trainingType: "Pull" })]);
    expect(result).toMatchObject({ ok: true, imported: 0, conflicts: 1 });
    expect(backend.writes).toHaveLength(0);
    expect(backend.docs.get("w")!.trainingType).toBe("Push");
  });

  it("telt ongeldige items, meldt ze en importeert de rest", async () => {
    const repo = make();
    await repo.load();
    const result = await repo.importWorkouts([makeWorkout({ id: "ok" }), 42, { id: "x", exercises: "nee" }]);
    expect(result.imported).toBe(1);
    expect(result.invalid).toBe(2);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("zet het oude formaat (één log per oefening) om naar workouts", async () => {
    const repo = make();
    await repo.load();
    const result = await repo.importWorkouts([
      { id: "a1", userId: "user-1", exercise: "Bench Press", date: "2026-03-10T12:00:00.000Z", sets: [{ weight: 80, reps: 5 }], volume: 400, estimated1RM: 93 },
      { id: "a2", userId: "user-1", exercise: "Squat", date: "2026-03-10T12:00:00.000Z", sets: [{ weight: 100, reps: 5 }], volume: 500, estimated1RM: 117 },
    ]);
    expect(result.imported).toBe(1);
    expect((result.workouts[0].exercises).map((e) => e.exercise).sort()).toEqual(["Bench Press", "Squat"]);
  });

  it("dubbele id's binnen één bestand worden maar één keer geïmporteerd", async () => {
    const repo = make();
    await repo.load();
    const result = await repo.importWorkouts([makeWorkout({ id: "d" }), makeWorkout({ id: "d" })]);
    expect(result.imported).toBe(1);
    expect(backend.writes[0]).toHaveLength(1);
  });

  it("niets te importeren schrijft niets", async () => {
    const repo = make();
    await repo.load();
    const result = await repo.importWorkouts([]);
    expect(result).toMatchObject({ ok: true, imported: 0 });
    expect(backend.writes).toHaveLength(0);
  });
});

describe("fouten van de server", () => {
  it("een weigering achteraf wordt gemeld en de lokale stand corrigeert zichzelf", async () => {
    const repo = make();
    await repo.load();
    const changes = vi.fn();
    repo.subscribe(changes);
    backend.rejectWith = Object.assign(new Error("nee"), { code: "permission-denied" });

    const result = await repo.add(makeWorkout({ id: "geweigerd" }));
    expect(result.ok).toBe(true); // lokaal toegepast; de server oordeelt later
    await tick();

    expect(onWriteError).toHaveBeenCalledTimes(1);
    expect(onWriteError.mock.calls[0][0]).toMatch(/Geen toegang tot je gegevens/);
    expect(changes).toHaveBeenCalled();
    expect((await repo.load()).workouts).toHaveLength(0);
  });

  it("geen toegang bij het laden (regels niet gepubliceerd) is zichtbaar en alleen-lezen: er wordt niets geschreven", async () => {
    backend.listenError = Object.assign(new Error("nee"), { code: "permission-denied" });
    const repo = make();
    const loaded = await repo.load();
    expect(loaded).toMatchObject({ status: "unavailable", readOnly: true, workouts: [] });
    expect(loaded.warnings[0]).toMatch(/Firestore-regels/);

    expect(await repo.add(makeWorkout({ id: "x" }))).toMatchObject({ ok: false, error: "read-only" });
    expect(await repo.update("x", { trainingType: "Push", exercises: [makeExercise("A", [[1, 1]])] })).toMatchObject({ ok: false, error: "read-only" });
    expect(await repo.remove("x")).toMatchObject({ ok: false, error: "read-only" });
    expect(await repo.restore("x")).toMatchObject({ ok: false, error: "read-only" });
    expect(await repo.importWorkouts([makeWorkout({ id: "y" })])).toMatchObject({ ok: false, error: "read-only", imported: 0 });
    expect(backend.writes).toHaveLength(0);
  });

  it("describeRemoteError geeft begrijpelijke meldingen", () => {
    expect(describeRemoteError({ code: "unauthenticated" })).toMatch(/opnieuw in/);
    expect(describeRemoteError({ code: "resource-exhausted" })).toMatch(/limiet/);
    expect(describeRemoteError({ code: "unavailable" })).toMatch(/later gesynchroniseerd/);
    expect(describeRemoteError({ code: "iets-raars" })).toMatch(/\(iets-raars\)/);
    expect(describeRemoteError("kapot")).toMatch(/mislukt/);
  });
});

describe("synchronisatie en levenscyclus", () => {
  it("meldt wijzigingen van een ander toestel aan abonnees, met de nieuwe stand", async () => {
    const repo = make();
    await repo.load();
    const listener = vi.fn();
    repo.subscribe(listener);
    backend.remoteChange("van-telefoon", doc(makeWorkout({ id: "van-telefoon" })));
    expect(listener).toHaveBeenCalledTimes(1);
    expect((await repo.load()).workouts.map((w) => w.id)).toEqual(["van-telefoon"]);
  });

  it("stopt met melden na afmelden en na dispose, en stopt dan ook met luisteren", async () => {
    const repo = make();
    await repo.load();
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = repo.subscribe(a);
    repo.subscribe(b);
    unsubA();
    backend.remoteChange("1", doc(makeWorkout({ id: "1" })));
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);

    repo.dispose();
    expect(backend.stopped).toBe(1);
    backend.remoteChange("2", doc(makeWorkout({ id: "2" })));
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("gegevens die pas ná de time-out binnenkomen worden alsnog gemeld (de lijst blijft niet leeg)", async () => {
    backend.holdFirstSnapshot = true;
    backend.seed("laat", doc(makeWorkout({ id: "laat" })));
    const repo = make({ loadTimeoutMs: 20 });
    const listener = vi.fn();
    repo.subscribe(listener);

    const first = await repo.load(); // time-out: nog niets binnen
    expect(first.workouts).toHaveLength(0);
    expect(listener).not.toHaveBeenCalled();

    backend.releaseFirstSnapshot();
    expect(listener).toHaveBeenCalledTimes(1);
    expect((await repo.load()).workouts.map((w) => w.id)).toEqual(["laat"]);
  });

  it("eerste gegevens vóór de time-out komen gewoon via load() terug", async () => {
    backend.seed("a", doc(makeWorkout({ id: "a" })));
    const repo = make();
    const listener = vi.fn();
    repo.subscribe(listener);
    expect((await repo.load()).workouts).toHaveLength(1);
    expect(listener).not.toHaveBeenCalled();
  });

  it("flushPending geeft de time-out door en het resultaat terug", async () => {
    const repo = make();
    backend.flushResult = false;
    expect(await repo.flushPending(1234)).toBe(false);
    backend.flushResult = true;
    expect(await repo.flushPending()).toBe(true);
    expect(backend.flushCalls).toEqual([1234, 5000]);
  });
});
