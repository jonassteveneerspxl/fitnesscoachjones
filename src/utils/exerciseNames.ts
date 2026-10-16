/**
 * Genormaliseerde sleutel om oefeningen te vergelijken: hoofdletterongevoelig, zonder accenten,
 * met koppeltekens/underscores als spatie en samengevouwen witruimte.
 * "Push-Ups", "push ups" en " Push-ups " zijn dezelfde oefening.
 * De catalogus en templates worden hiervoor niet aangepast.
 */
export function normalizeExerciseName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isSameExercise(a: string, b: string): boolean {
  return normalizeExerciseName(a) === normalizeExerciseName(b);
}
