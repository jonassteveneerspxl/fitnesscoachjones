/**
 * Eigen oefeningen: aanvullingen op de ingebouwde lijst (bv. een fly machine naast cable flyes). Ze staan per
 * gebruiker in de database en verschijnen in de oefeningkiezer. Workouts bewaren alleen de naam, dus een eigen
 * oefening verwijderen verandert nooit je opgeslagen trainingen.
 */
import { Exercise, MuscleGroup, PPLCategory, exercises as builtIn, muscleGroupLabels } from "@/data/exercises";
import { isSameExercise } from "@/utils/exerciseNames";

export interface CustomExercise extends Exercise {
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

export interface NewExerciseInput {
  name: string;
  muscleGroup: string;
  equipment?: string;
}

export interface ValidationResult {
  ok: boolean;
  message?: string;
  value?: { name: string; muscleGroup: MuscleGroup; pplCategory: PPLCategory; equipment?: string };
}

/** Controleert een nieuwe oefening tegen de ingebouwde lijst en je eigen oefeningen (hoofdletter- en koppeltekenongevoelig). */
export function validateNewExercise(input: NewExerciseInput, existing: Exercise[]): ValidationResult {
  const name = cleanName(input.name);
  if (name.length < MIN_NAME) return { ok: false, message: `Geef de oefening een naam van minstens ${MIN_NAME} tekens.` };
  if (name.length > MAX_NAME) return { ok: false, message: `De naam mag maximaal ${MAX_NAME} tekens zijn.` };
  if (!isMuscleGroup(input.muscleGroup)) return { ok: false, message: "Kies een spiergroep." };
  const equipment = cleanName(input.equipment ?? "");
  if (equipment.length > MAX_EQUIPMENT) return { ok: false, message: `Het apparaat mag maximaal ${MAX_EQUIPMENT} tekens zijn.` };
  const same = existing.find((e) => isSameExercise(e.name, name));
  if (same) return { ok: false, message: `"${same.name}" bestaat al.` };
  return {
    ok: true,
    value: {
      name,
      muscleGroup: input.muscleGroup,
      pplCategory: defaultPplFor(input.muscleGroup),
      ...(equipment ? { equipment } : {}),
    },
  };
}

/** Leest een databasedocument. Ongeldige documenten worden overgeslagen (`null`), nooit aangepast. */
export function parseCustomExercise(id: string, data: Record<string, unknown>): CustomExercise | null {
  const name = typeof data.name === "string" ? cleanName(data.name) : "";
  if (name.length < MIN_NAME || name.length > MAX_NAME) return null;
  if (!isMuscleGroup(data.muscleGroup)) return null;
  const equipment = typeof data.equipment === "string" ? cleanName(data.equipment).slice(0, MAX_EQUIPMENT) : "";
  return {
    id,
    name,
    muscleGroup: data.muscleGroup,
    pplCategory: isPpl(data.pplCategory) ? data.pplCategory : defaultPplFor(data.muscleGroup),
    ...(equipment ? { equipment } : {}),
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    custom: true,
  };
}

export const sortByName = <T extends Exercise>(list: T[]): T[] =>
  [...list].sort((a, b) => a.name.localeCompare(b.name, "nl", { sensitivity: "base" }));

/** Ingebouwde en eigen oefeningen samen; bij gelijke naam wint de ingebouwde. */
export function mergeCatalog(custom: CustomExercise[]): Exercise[] {
  const extra = custom.filter((c) => !builtIn.some((b) => isSameExercise(b.name, c.name)));
  return [...builtIn, ...sortByName(extra)];
}

export function searchIn(list: Exercise[], query: string): Exercise[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return list.filter(
    (e) => e.name.toLowerCase().includes(q) || e.muscleGroup.toLowerCase().includes(q) || e.equipment?.toLowerCase().includes(q)
  );
}
