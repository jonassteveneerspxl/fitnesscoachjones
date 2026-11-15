import type { TrainingType } from "@/types/workout";

/** Wat de gebruiker ziet. De opgeslagen waarde ("Custom") blijft ongewijzigd. */
export function trainingTypeLabel(type: TrainingType): string {
  if (type === "Custom") return "Eigen training";
  if (type === "Full Body") return "Volledig lichaam";
  return type;
}
