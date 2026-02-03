import { WorkoutLog, CoachResponse, SetData } from "@/types/workout";

// Epley formula for 1RM estimation
export function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export function calculateVolumeFromSets(sets: SetData[]): number {
  return sets.reduce((total, set) => total + set.weight * set.reps, 0);
}

export function getBest1RMFromSets(sets: SetData[]): number {
  return Math.max(...sets.map((set) => calculate1RM(set.weight, set.reps)));
}

export function checkForPR(
  exercise: string,
  sets: SetData[],
  previousLogs: WorkoutLog[]
): boolean {
  const exerciseLogs = previousLogs.filter(
    (log) => log.exercise.toLowerCase() === exercise.toLowerCase()
  );

  if (exerciseLogs.length === 0) return true; // First time = PR!

  const current1RM = getBest1RMFromSets(sets);
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
  sets: SetData[],
  previousLogs: WorkoutLog[]
): CoachResponse {
  const volume = calculateVolumeFromSets(sets);
  const estimated1RM = getBest1RMFromSets(sets);
  const newPR = checkForPR(exercise, sets, previousLogs);

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
