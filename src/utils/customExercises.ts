/**
 * Eigen oefeningen: aanvullingen op de ingebouwde lijst (bv. een fly machine naast cable flyes). Ze staan per
 * gebruiker in de database en verschijnen in de oefeningkiezer. Workouts bewaren alleen de naam, dus een eigen
 * oefening verwijderen verandert nooit je opgeslagen trainingen.
 */
import { Exercise, MuscleGroup, PPLCategory, exercises as builtIn, muscleGroupLabels } from "@/data/exercises";
import { isSameExercise } from "@/utils/exerciseNames";
import { EXERCISE_KINDS, ExerciseKind } from "@/types/workout";

export interface CustomExercise extends Exercise {
  /** Afwezig = kracht (gewicht en herhalingen). "time" = houd-oefening, "cardio" = afstand en tijd. */
  kind?: ExerciseKind;
  id: string;
  createdAt: string;
  custom: true;
}

export const MIN_NAME = 2;
export const MAX_NAME = 60;
export const MAX_EQUIPMENT = 40;
export const MAX_CUSTOM_EXERCISES = 300;

const MUSCLE_GROUPS = Object.keys(muscleGroupLabels) as MuscleGroup[];
export const isMuscleGroup = (v: unknown): v is MuscleGroup => MUSCLE_GROUPS.includes(v as MuscleGroup);
const isPpl = (v: unknown): v is PPLCategory => v === "push" || v === "pull" || v === "legs";

/** Push/pull/legs volgt de ingebouwde lijst: de categorie die bij een spiergroep het vaakst voorkomt. */
export function defaultPplFor(muscle: MuscleGroup): PPLCategory {
  const counts: Record<PPLCategory, number> = { push: 0, pull: 0, legs: 0 };
  for (const e of builtIn) if (e.muscleGroup === muscle) counts[e.pplCategory]++;
  return (Object.keys(counts) as PPLCategory[]).reduce((best, c) => (counts[c] > counts[best] ? c : best), "legs");
}

export const cleanName = (name: string) => name.replace(/\s+/g, " ").trim();

/**
 * Voor een cardio-oefening is er geen spiergroep. De velden `muscleGroup` en `pplCategory` hebben dan alleen een
 * vulwaarde zodat het type klopt; cardio-oefeningen zitten niet in de lijst met krachtoefeningen en tellen niet per spiergroep.
 */
const CARDIO_FILLER: { muscleGroup: MuscleGroup; pplCategory: PPLCategory } = { muscleGroup: "core", pplCategory: "legs" };

export interface NewExerciseInput {
  name: string;
  kind?: string;
  muscleGroup: string;
  equipment?: string;
}

export interface ValidationResult {
  ok: boolean;
  message?: string;
  value?: { name: string; kind?: ExerciseKind; muscleGroup: MuscleGroup; pplCategory: PPLCategory; equipment?: string };
}

/** Controleert een nieuwe oefening tegen de ingebouwde lijst en je eigen oefeningen (hoofdletter- en koppeltekenongevoelig). */
export function validateNewExercise(input: NewExerciseInput, existing: Exercise[]): ValidationResult {
  const name = cleanName(input.name);
  if (name.length < MIN_NAME) return { ok: false, message: `Geef de oefening een naam van minstens ${MIN_NAME} tekens.` };
  if (name.length > MAX_NAME) return { ok: false, message: `De naam mag maximaal ${MAX_NAME} tekens zijn.` };
  const kind: ExerciseKind = (EXERCISE_KINDS as readonly unknown[]).includes(input.kind) ? (input.kind as ExerciseKind) : "strength";
  if (kind !== "cardio" && !isMuscleGroup(input.muscleGroup)) return { ok: false, message: "Kies een spiergroep." };
  const equipment = cleanName(input.equipment ?? "");
  if (equipment.length > MAX_EQUIPMENT) return { ok: false, message: `Het apparaat mag maximaal ${MAX_EQUIPMENT} tekens zijn.` };
  const same = existing.find((e) => isSameExercise(e.name, name));
  if (same) return { ok: false, message: `"${same.name}" bestaat al.` };
  return {
    ok: true,
    value: {
      name,
      ...(kind !== "strength" ? { kind } : {}),
      ...(kind === "cardio"
        ? CARDIO_FILLER
        : { muscleGroup: input.muscleGroup as MuscleGroup, pplCategory: defaultPplFor(input.muscleGroup as MuscleGroup) }),
      ...(equipment ? { equipment } : {}),
    },
  };
}

/** Leest een databasedocument. Ongeldige documenten worden overgeslagen (`null`), nooit aangepast. */
export function parseCustomExercise(id: string, data: Record<string, unknown>): CustomExercise | null {
  const name = typeof data.name === "string" ? cleanName(data.name) : "";
  if (name.length < MIN_NAME || name.length > MAX_NAME) return null;
  const kind: ExerciseKind | undefined = data.kind === "time" || data.kind === "cardio" ? data.kind : undefined;
  if (kind !== "cardio" && !isMuscleGroup(data.muscleGroup)) return null;
  const equipment = typeof data.equipment === "string" ? cleanName(data.equipment).slice(0, MAX_EQUIPMENT) : "";
  return {
    id,
    name,
    ...(kind ? { kind } : {}),
    ...(kind === "cardio"
      ? CARDIO_FILLER
      : {
          muscleGroup: data.muscleGroup as MuscleGroup,
          pplCategory: isPpl(data.pplCategory) ? data.pplCategory : defaultPplFor(data.muscleGroup as MuscleGroup),
        }),
    ...(equipment ? { equipment } : {}),
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    custom: true,
  };
}

export const sortByName = <T extends Exercise>(list: T[]): T[] =>
  [...list].sort((a, b) => a.name.localeCompare(b.name, "nl", { sensitivity: "base" }));

/** Ingebouwde en eigen oefeningen samen; bij gelijke naam wint de ingebouwde. */
export function mergeCatalog(custom: CustomExercise[]): Exercise[] {
  // Cardio-oefeningen horen niet in de krachtlijst; die staan in `cardioActivities`.
  const extra = custom.filter((c) => c.kind !== "cardio" && !builtIn.some((b) => isSameExercise(b.name, c.name)));
  return [...builtIn, ...sortByName(extra)];
}

export function searchIn(list: Exercise[], query: string): Exercise[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return list.filter(
    (e) => e.name.toLowerCase().includes(q) || e.muscleGroup.toLowerCase().includes(q) || e.equipment?.toLowerCase().includes(q)
  );
}

/** Cardiosoorten: de standaardlijst plus je eigen cardio-oefeningen, zonder dubbelen. */
export function cardioActivities(custom: CustomExercise[], standard: readonly string[]): string[] {
  const own = custom.filter((c) => c.kind === "cardio").map((c) => c.name);
  const out = [...standard];
  for (const name of own) if (!out.some((s) => isSameExercise(s, name))) out.push(name);
  return out;
}
