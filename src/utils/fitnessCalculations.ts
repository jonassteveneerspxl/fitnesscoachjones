import { Workout, ExerciseLog, CoachResponse, SetData } from "@/types/workout";

// Epley formula for 1RM estimation
export function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export function calculateVolumeFromSets(sets: SetData[]): number {
  return sets.reduce((total, set) => total + set.weight * set.reps, 0);
}

export function getBest1RMFromSets(sets: SetData[]): number {
  if (sets.length === 0) return 0;
  return Math.max(...sets.map((set) => calculate1RM(set.weight, set.reps)));
}

export function checkForPR(
  exercise: string,
  sets: SetData[],
  previousWorkouts: Workout[]
): boolean {
  const previousExercises = previousWorkouts.flatMap((w) =>
    w.exercises.filter(
      (e) => e.exercise.toLowerCase() === exercise.toLowerCase()
    )
  );

  if (previousExercises.length === 0) return true; // First time = PR!

  const current1RM = getBest1RMFromSets(sets);
  const maxPrevious1RM = Math.max(
    ...previousExercises.map((e) => e.estimated1RM)
  );

  return current1RM > maxPrevious1RM;
}

const prMessages = [
  "🔥 Nieuwe PR op {exercise}! Geweldig werk!",
  "💪 BOOM! Nieuw persoonlijk record op {exercise}!",
  "🏆 PR ALERT! {exercise} naar een nieuw niveau!",
  "⚡ Ongelooflijk! Je hebt jezelf overtroffen op {exercise}!",
];

const motivationalMessages = [
  "Goed bezig! Blijf consistent en die PR komt vanzelf.",
  "Sterke workout! Elke rep brengt je dichter bij je doel.",
  "Mooi werk! Je bouwt aan een sterker lichaam.",
  "Solide training vandaag!",
];

export function generateCoachResponse(
  exercises: ExerciseLog[],
  previousWorkouts: Workout[]
): CoachResponse {
  const exerciseResults = exercises.map((ex) => ({
    exercise: ex.exercise,
    volume: ex.volume,
    estimated1RM: ex.estimated1RM,
    newPR: checkForPR(ex.exercise, ex.sets, previousWorkouts),
  }));

  const totalVolume = exercises.reduce((sum, ex) => sum + ex.volume, 0);
  const hasPR = exerciseResults.some((r) => r.newPR);

  let message: string;
  if (hasPR) {
    const prExercises = exerciseResults.filter((r) => r.newPR);
    const randomPR = prMessages[Math.floor(Math.random() * prMessages.length)];
    message = randomPR.replace("{exercise}", prExercises[0].exercise);
    if (prExercises.length > 1) {
      message += ` En nog ${prExercises.length - 1} andere PR(s)!`;
    }
  } else {
    message =
      motivationalMessages[
        Math.floor(Math.random() * motivationalMessages.length)
      ];
  }

  return {
    message,
    exercises: exerciseResults,
    totalVolume,
  };
}
