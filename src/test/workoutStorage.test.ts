import { describe, it, expect, beforeEach } from "vitest";
import {
  LEGACY_BACKUP_KEY,
  LEGACY_STORAGE_KEY,
  PRE_IMPORT_BACKUP_KEY,
  STORAGE_KEY_V2,
  MAX_TRASH,
  createLocalStorageRepository,
  loadFromStorage,
  sortWorkoutsNewestFirst,
} from "@/utils/workoutStorage";
import { migrateLegacyLogs, normalizeWorkout } from "@/utils/workoutNormalization";
import { MemoryStorage, makeExercise, makeWorkout } from "./factories";

let storage: MemoryStorage;
beforeEach(() => {
  storage = new MemoryStorage();
});

const repo = () => createLocalStorageRepository(storage);

const legacyLogs = [
  { id: "l1", userId: "u", exercise: "Squat", sets: [{ weight: 100, reps: 5 }], date: "2026-03-10T09:00:00.000Z", volume: 500, estimated1RM: 117 },
  { id: "l2", userId: "u", exercise: "Row", sets: [{ weight: 60, reps: 8 }], date: "2026-03-10T10:00:00.000Z", volume: 480, estimated1RM: 76 },
  { id: "l3", userId: "u", exercise: "Curl", sets: [{ weight: 20, reps: 10 }], date: "2026-03-12T10:00:00.000Z", volume: 200, estimated1RM: 27 },
];

describe("normalizeWorkout", () => {
  it("herberekent afgeleide velden uit de sets en verzint geen tijdzone", () => {
    const { workout } = normalizeWorkout({
      id: "x",
      date: "2026-03-10T12:00:00.000Z",
      exercises: [{ exercise: "Bench Press", sets: [{ weight: 80, reps: 5 }], volume: 999, estimated1RM: 1 }],
      totalVolume: 12345,
    });
    expect(workout!.exercises[0].volume).toBe(400);
    expect(workout!.totalVolume).toBe(400);
    expect(workout!.timeZone).toBeNull();
    expect(workout!.trainingType).toBe("Onbekend");
    expect(workout!.startedAt).toBe("2026-03-10T12:00:00.000Z");
    expect(workout!.exercises[0].sets[0].setNumber).toBe(1);
  });

  it("ongeldige datum blijft null (niet 'nu') en de oorspronkelijke waarde blijft in `date`", () => {
    const { workout, issues } = normalizeWorkout({ id: "x", date: "kapot", exercises: [] });
    expect(workout!.startedAt).toBeNull();
    expect(workout!.date).toBe("kapot");
    expect(issues.join()).toContain("geldige datum");
  });

  it("slaat ongeldige sets over en meldt dat; bewaart geldige setnummers", () => {
    const { workout, issues } = normalizeWorkout({
      id: "x",
      date: "2026-03-10T12:00:00.000Z",
      exercises: [
        {
          exercise: "Squat",
          sets: [
            { setNumber: 1, weight: 100, reps: 5 },
            { weight: -5, reps: 5 },
            { weight: 100, reps: 0 },
            { weight: "100", reps: 5 },
            { setNumber: 4, weight: 90, reps: 8 },
          ],
        },
      ],
    });
    expect(workout!.exercises[0].sets.map((s) => [s.setNumber, s.weight, s.reps])).toEqual([
      [1, 100, 5],
      [4, 90, 8],
    ]);
    expect(issues).toHaveLength(3);
  });

  it("weigert objecten zonder oefeningenlijst", () => {
    expect(normalizeWorkout({ id: "x" }).workout).toBeNull();
    expect(normalizeWorkout(null).workout).toBeNull();
    expect(normalizeWorkout([1]).workout).toBeNull();
  });

  it("zet onbekende trainingstypes om naar Onbekend en behoudt geldige", () => {
    const base = { id: "x", date: "2026-03-10T12:00:00.000Z", exercises: [] };
    expect(normalizeWorkout({ ...base, trainingType: "Push" }).workout!.trainingType).toBe("Push");
    expect(normalizeWorkout({ ...base, trainingType: "Yoga" }).workout!.trainingType).toBe("Onbekend");
  });
});

describe("migrateLegacyLogs", () => {
  it("groepeert per kalenderdag in de opgegeven tijdzone", () => {
    const logs = [
      { id: "a", exercise: "A", sets: [{ weight: 1, reps: 1 }], date: "2026-03-10T07:00:00.000Z" },
      { id: "b", exercise: "B", sets: [{ weight: 1, reps: 1 }], date: "2026-03-10T18:30:00.000Z" },
      { id: "c", exercise: "C", sets: [{ weight: 1, reps: 1 }], date: "2026-03-10T23:30:00.000Z" },
    ];
    const count = (tz: string) => migrateLegacyLogs(logs, tz).length;
    expect(count("Europe/Brussels")).toBe(2); // c valt op 11 maart
    expect(count("America/Los_Angeles")).toBe(1);
    expect(count("Pacific/Auckland")).toBe(2);
  });

  it("gebruikt het vroegste log als starttijd en voegt logs zonder geldige datum nooit samen", () => {
    const res = migrateLegacyLogs(
      [
        { id: "b", exercise: "B", sets: [{ weight: 1, reps: 1 }], date: "2026-03-10T10:00:00.000Z" },
        { id: "a", exercise: "A", sets: [{ weight: 1, reps: 1 }], date: "2026-03-10T09:00:00.000Z" },
        { id: "x", exercise: "X", sets: [{ weight: 1, reps: 1 }], date: "kapot" },
        { id: "y", exercise: "Y", sets: [{ weight: 1, reps: 1 }] },
      ],
      "UTC"
    );
    expect(res).toHaveLength(3);
    expect(res[0].workout!.startedAt).toBe("2026-03-10T09:00:00.000Z");
    expect(res[0].workout!.exercises.map((e) => e.exercise)).toEqual(["A", "B"]);
    expect(res[1].workout!.startedAt).toBeNull();
    expect(res[2].workout!.startedAt).toBeNull();
  });

  it("slaat niet-objecten over zonder te crashen", () => {
    const res = migrateLegacyLogs([null, 5, "x"], "UTC");
    expect(res.every((r) => r.workout === null)).toBe(true);
  });
});

describe("loadFromStorage", () => {
  it("lege opslag geeft status 'empty' en schrijft niets", () => {
    const r = loadFromStorage(storage);
    expect(r.status).toBe("empty");
    expect(storage.keys()).toEqual([]);
  });

  it("migreert het oude log-formaat: oude sleutel blijft byte-voor-byte gelijk, back-up en v2 worden aangemaakt", () => {
    const raw = JSON.stringify(legacyLogs);
    storage.setItem(LEGACY_STORAGE_KEY, raw);
    const r = loadFromStorage(storage);
    expect(r.status).toBe("migrated");
    expect(r.workouts.length).toBeGreaterThan(0);
    expect(storage.getItem(LEGACY_STORAGE_KEY)).toBe(raw);
    expect(storage.getItem(LEGACY_BACKUP_KEY)).toBe(raw);
    expect(JSON.parse(storage.getItem(STORAGE_KEY_V2)!).schemaVersion).toBe(2);
  });

  it("migreert het huidige workout-formaat 1:1 (geen samenvoeging van sessies op dezelfde dag)", () => {
    const old = [
      { id: "a", userId: "user-1", date: "2026-03-10T07:00:00.000Z", totalVolume: 100, exercises: [{ exercise: "Bench Press", sets: [{ weight: 50, reps: 2 }], volume: 100, estimated1RM: 53 }] },
      { id: "b", userId: "user-1", date: "2026-03-10T18:00:00.000Z", totalVolume: 100, exercises: [{ exercise: "Squat", sets: [{ weight: 50, reps: 2 }], volume: 100, estimated1RM: 53 }] },
    ];
    storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(old));
    const r = loadFromStorage(storage);
    expect(r.workouts.map((w) => w.id)).toEqual(["b", "a"]); // nieuwste eerst
    expect(r.workouts.every((w) => w.trainingType === "Onbekend" && w.timeZone === null)).toBe(true);
    expect(r.workouts[0].exercises[0].sets[0].setNumber).toBe(1);
  });

  it("een bestaande back-up wordt niet overschreven", () => {
    storage.setItem(LEGACY_BACKUP_KEY, "EERDERE BACKUP");
    storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacyLogs));
    loadFromStorage(storage);
    expect(storage.getItem(LEGACY_BACKUP_KEY)).toBe("EERDERE BACKUP");
  });

  it("migratie is idempotent: tweede keer laden leest v2 en migreert niet opnieuw", () => {
    storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacyLogs));
    const first = loadFromStorage(storage);
    const second = loadFromStorage(storage);
    expect(second.status).toBe("loaded");
    expect(second.workouts).toEqual(first.workouts);
  });

  it("als schrijven bij migratie faalt blijft de oude data intact en wordt het later opnieuw geprobeerd", () => {
    const raw = JSON.stringify(legacyLogs);
    storage.setItem(LEGACY_STORAGE_KEY, raw);
    storage.failWrites = true;
    const r = loadFromStorage(storage);
    expect(r.status).toBe("migrated");
    expect(r.warnings.join()).toContain("opnieuw geprobeerd");
    expect(storage.getItem(LEGACY_STORAGE_KEY)).toBe(raw);
    storage.failWrites = false;
    expect(loadFromStorage(storage).status).toBe("migrated");
    expect(loadFromStorage(storage).status).toBe("loaded");
  });

  it("onleesbare oude data blijft onaangeroerd", () => {
    storage.setItem(LEGACY_STORAGE_KEY, "{kapot");
    const r = loadFromStorage(storage);
    expect(r.status).toBe("legacy-unreadable");
    expect(storage.getItem(LEGACY_STORAGE_KEY)).toBe("{kapot");
    expect(storage.getItem(STORAGE_KEY_V2)).toBeNull();
  });

  it("corrupte v2-data wordt in quarantaine gezet in plaats van overschreven", () => {
    storage.setItem(STORAGE_KEY_V2, "{kapot");
    const r = loadFromStorage(storage);
    expect(r.status).toBe("corrupt");
    expect(r.workouts).toEqual([]);
    const q = storage.keys().find((k) => k.includes("quarantine"));
    expect(q).toBeDefined();
    expect(storage.getItem(q!)).toBe("{kapot");
  });

  it("een nieuwere schemaversie maakt de opslag alleen-lezen en wijzigt niets", async () => {
    const raw = JSON.stringify({ schemaVersion: 99, savedAt: "x", workouts: [] });
    storage.setItem(STORAGE_KEY_V2, raw);
    const r = loadFromStorage(storage);
    expect(r.status).toBe("unsupported");
    expect(r.readOnly).toBe(true);
    const res = await repo().add(makeWorkout());
    expect(res.ok).toBe(false);
    expect(res.error).toBe("read-only");
    expect(storage.getItem(STORAGE_KEY_V2)).toBe(raw);
  });

  it("afwijkende items in v2 worden gemeld en het origineel wordt bewaard", () => {
    const good = makeWorkout({ id: "good" });
    storage.setItem(
      STORAGE_KEY_V2,
      JSON.stringify({ schemaVersion: 2, savedAt: "x", workouts: [good, { id: "bad" }, 5] })
    );
    const r = loadFromStorage(storage);
    expect(r.workouts.map((w) => w.id)).toEqual(["good"]);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(storage.keys().some((k) => k.includes("quarantine"))).toBe(true);
  });
});

describe("sortWorkoutsNewestFirst", () => {
  it("sorteert op startedAt aflopend, ongeldige datums onderaan in bestaande volgorde", () => {
    const sorted = sortWorkoutsNewestFirst([
      makeWorkout({ id: "none1", startedAt: null }),
      makeWorkout({ id: "old", startedAt: "2026-01-01T10:00:00.000Z" }),
      makeWorkout({ id: "none2", startedAt: null }),
      makeWorkout({ id: "new", startedAt: "2026-03-01T10:00:00.000Z" }),
    ]);
    expect(sorted.map((w) => w.id)).toEqual(["new", "old", "none1", "none2"]);
  });
});

describe("repository: opslaan en terughalen", () => {
  it("bewaart een workout, ook na 'herladen' (nieuwe repository op dezelfde opslag)", async () => {
    const w = makeWorkout({ id: "a" });
    expect((await repo().add(w)).ok).toBe(true);
    const reloaded = await createLocalStorageRepository(storage).load();
    expect(reloaded.workouts).toHaveLength(1);
    expect(reloaded.workouts[0]).toMatchObject({ id: "a", trainingType: "Push", timeZone: "Europe/Brussels" });
    expect(reloaded.workouts[0].createdAt).toBeDefined();
  });

  it("meerdere workouts op dezelfde dag blijven aparte sessies met eigen sets", async () => {
    await repo().add(makeWorkout({ id: "ochtend", startedAt: "2026-03-10T07:00:00.000Z", exercises: [makeExercise("Bench Press", [[80, 5], [80, 4]])] }));
    await repo().add(makeWorkout({ id: "avond", startedAt: "2026-03-10T17:00:00.000Z", trainingType: "Legs", exercises: [makeExercise("Squat", [[100, 5], [100, 5], [100, 4]])] }));
    const { workouts } = await repo().load();
    expect(workouts.map((w) => w.id)).toEqual(["avond", "ochtend"]);
    expect(workouts[0].exercises[0].sets).toHaveLength(3);
    expect(workouts[1].exercises[0].sets).toHaveLength(2);
    expect(workouts[0].exercises[0].exercise).toBe("Squat");
  });

  it("weigert een bestaand id: niets wordt overschreven", async () => {
    await repo().add(makeWorkout({ id: "a" }));
    const dup = await repo().add(makeWorkout({ id: "a", trainingType: "Legs" }));
    expect(dup.ok).toBe(false);
    expect(dup.error).toBe("duplicate-id");
    const { workouts } = await repo().load();
    expect(workouts).toHaveLength(1);
    expect(workouts[0].trainingType).toBe("Push");
  });

  it("twee 'tabbladen' die elk toevoegen overschrijven elkaar niet", async () => {
    const tabA = createLocalStorageRepository(storage);
    const tabB = createLocalStorageRepository(storage);
    await tabA.load();
    await tabB.load();
    await tabA.add(makeWorkout({ id: "a", startedAt: "2026-03-01T10:00:00.000Z" }));
    await tabB.add(makeWorkout({ id: "b", startedAt: "2026-03-02T10:00:00.000Z" }));
    const { workouts } = await tabA.load();
    expect(workouts.map((w) => w.id).sort()).toEqual(["a", "b"]);
  });

  it("bij een opslagfout (quota) blijft de eerdere data intact en komt er een foutmelding", async () => {
    await repo().add(makeWorkout({ id: "a" }));
    storage.failWrites = true;
    const res = await repo().add(makeWorkout({ id: "b" }));
    expect(res.ok).toBe(false);
    expect(res.error).toBe("storage-error");
    expect(res.workouts.map((w) => w.id)).toEqual(["a"]);
    storage.failWrites = false;
    expect((await repo().load()).workouts.map((w) => w.id)).toEqual(["a"]);
  });

  it("zonder localStorage valt de repository terug op geheugen (geen crash)", async () => {
    const memoryOnly = createLocalStorageRepository(null);
    expect((await memoryOnly.add(makeWorkout({ id: "a" }))).ok).toBe(true);
    expect((await memoryOnly.load()).workouts).toHaveLength(1);
  });
});

describe("repository: bewerken", () => {
  it("wijzigt alleen type en oefeningen; id, starttijd en tijdzone blijven, geen nieuwe sessie", async () => {
    await repo().add(makeWorkout({ id: "a", startedAt: "2026-03-10T12:00:00.000Z", timeZone: "Europe/Brussels" }));
    const res = await repo().update("a", {
      trainingType: "Upper",
      exercises: [makeExercise("Overhead Press", [[50, 8]])],
    });
    expect(res.ok).toBe(true);
    const { workouts } = await repo().load();
    expect(workouts).toHaveLength(1);
    expect(workouts[0]).toMatchObject({
      id: "a",
      startedAt: "2026-03-10T12:00:00.000Z",
      timeZone: "Europe/Brussels",
      trainingType: "Upper",
      totalVolume: 400,
    });
    expect(workouts[0].exercises[0].exercise).toBe("Overhead Press");
    expect(workouts[0].updatedAt).toBeDefined();
    expect(workouts[0].createdAt).toBeDefined();
  });

  it("onbekend id → not-found en niets verandert", async () => {
    await repo().add(makeWorkout({ id: "a" }));
    const res = await repo().update("zzz", { trainingType: "Pull", exercises: [] });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("not-found");
    expect((await repo().load()).workouts[0].trainingType).toBe("Push");
  });

  it("een wijziging die ongeldige oefeningen bevat wordt niet stilzwijgend half opgeslagen", async () => {
    await repo().add(makeWorkout({ id: "a" }));
    // @ts-expect-error bewust ongeldig
    const res = await repo().update("a", { trainingType: "Push", exercises: "kapot" });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("invalid");
    expect((await repo().load()).workouts[0].exercises[0].exercise).toBe("Bench Press");
  });
});

describe("repository: verwijderen met herstel", () => {
  it("verplaatst naar de prullenbak en kan hersteld worden", async () => {
    await repo().add(makeWorkout({ id: "a" }));
    const removed = await repo().remove("a");
    expect(removed.ok).toBe(true);
    expect(removed.workouts).toHaveLength(0);
    expect(removed.trash.map((t) => t.workout.id)).toEqual(["a"]);

    const restored = await repo().restore("a");
    expect(restored.ok).toBe(true);
    expect(restored.workouts.map((w) => w.id)).toEqual(["a"]);
    expect(restored.trash).toHaveLength(0);
  });

  it("de prullenbak overleeft herladen en is begrensd", async () => {
    for (let i = 0; i < MAX_TRASH + 5; i++) {
      await repo().add(makeWorkout({ id: `w${i}`, startedAt: `2026-01-01T10:${String(i % 60).padStart(2, "0")}:00.000Z` }));
      await repo().remove(`w${i}`);
    }
    const { trash } = await repo().load();
    expect(trash).toHaveLength(MAX_TRASH);
    expect(trash[0].workout.id).toBe(`w${MAX_TRASH + 4}`);
  });

  it("onbekend id verwijderen verandert niets", async () => {
    await repo().add(makeWorkout({ id: "a" }));
    const res = await repo().remove("nope");
    expect(res.ok).toBe(false);
    expect((await repo().load()).workouts).toHaveLength(1);
  });

  it("een verwijderd id kan niet opnieuw als nieuwe workout worden toegevoegd (geen stille overschrijving)", async () => {
    await repo().add(makeWorkout({ id: "a" }));
    await repo().remove("a");
    expect((await repo().add(makeWorkout({ id: "a" }))).error).toBe("duplicate-id");
  });
});

describe("repository: import", () => {
  it("voegt toe zonder bestaande workouts te overschrijven en maakt eerst een back-up", async () => {
    await repo().add(makeWorkout({ id: "a" }));
    const before = storage.getItem(STORAGE_KEY_V2);
    const res = await repo().importWorkouts([
      makeWorkout({ id: "a" }), // identiek: duplicaat
      makeWorkout({ id: "a", trainingType: "Legs" }), // zelfde id, andere inhoud: conflict
      makeWorkout({ id: "b", startedAt: "2026-03-11T10:00:00.000Z" }),
      { id: "kapot" }, // ongeldig
    ]);
    expect(res).toMatchObject({ ok: true, imported: 1, skippedDuplicates: 1, conflicts: 1, invalid: 1 });
    expect(storage.getItem(PRE_IMPORT_BACKUP_KEY)).toBe(before);
    const { workouts } = await repo().load();
    expect(workouts.map((w) => w.id).sort()).toEqual(["a", "b"]);
    expect(workouts.find((w) => w.id === "a")!.trainingType).toBe("Push");
  });

  it("importeert ook het oude log-formaat", async () => {
    const res = await repo().importWorkouts(legacyLogs);
    expect(res.ok).toBe(true);
    expect(res.imported).toBeGreaterThan(0);
  });

  it("niets te importeren → geen back-up, geen schrijfactie", async () => {
    const res = await repo().importWorkouts([{ id: "kapot" }]);
    expect(res.ok).toBe(true);
    expect(res.imported).toBe(0);
    expect(storage.keys()).toEqual([]);
  });

  it("dezelfde id twee keer in één bestand: de tweede wordt gemeld, niet dubbel toegevoegd", async () => {
    const res = await repo().importWorkouts([makeWorkout({ id: "x" }), makeWorkout({ id: "x", trainingType: "Pull" })]);
    expect(res.imported).toBe(1);
    expect(res.conflicts).toBe(1);
  });
});
