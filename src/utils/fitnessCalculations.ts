import { WorkoutLog, CoachResponse } from "@/types/workout";

// Epley formula for 1RM estimation
export function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export function calculateVolume(sets: number, reps: number, weight: number): number {
  return sets * reps * weight;
}

export function checkForPR(
  exercise: string,
  weight: number,
  reps: number,
  previousLogs: WorkoutLog[]
): boolean {
  const exerciseLogs = previousLogs.filter(
    (log) => log.exercise.toLowerCase() === exercise.toLowerCase()
  );

  if (exerciseLogs.length === 0) return true; // First time = PR!

  const current1RM = calculate1RM(weight, reps);
  const maxPrevious1RM = Math.max(...exerciseLogs.map((log) => log.estimated1RM));

  return current1RM > maxPrevious1RM;
}

const prMessages = [
  "🔥 Nieuwe PR op {exercise}! Geweldig werk, je wordt sterker!",
  "💪 BOOM! Nieuw persoonlijk record op {exercise}! Keep crushing it!",
  "🏆 PR ALERT! {exercise} is naar een nieuw niveau getild!",
  "⚡ Ongelooflijk! Je hebt jezelf overtroffen op {exercise}!",
];

const motivationalMessages = [
  "Goed bezig! Blijf consistent en die PR komt vanzelf.",
  "Sterke set! Volgende keer kunnen we misschien iets meer pushen.",
  "Mooi werk! Elke rep brengt je dichter bij je doel.",
  "Solide training! Je bouwt aan een sterker lichaam.",
];

export function generateCoachResponse(
  exercise: string,
  weight: number,
  reps: number,
  sets: number,
  previousLogs: WorkoutLog[]
): CoachResponse {
  const volume = calculateVolume(sets, reps, weight);
  const estimated1RM = calculate1RM(weight, reps);
  const newPR = checkForPR(exercise, weight, reps, previousLogs);

  let message: string;
  if (newPR) {
    const randomPR = prMessages[Math.floor(Math.random() * prMessages.length)];
    message = randomPR.replace("{exercise}", exercise);
  } else {
    message = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
  }

  return {
    message,
    volume,
    estimated1RM,
    newPR,
  };
}
